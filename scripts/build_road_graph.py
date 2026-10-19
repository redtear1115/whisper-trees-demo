# /// script
# requires-python = ">=3.11"
# dependencies = ["shapely>=2.1", "pyproj", "numpy"]
# ///
"""Build the walking graph (roads and paths) of each Taipei district, for the 「怎麼走」 route and the 集章冊 village tours.

Inputs:
  material/raw/osm/roads_osm.json   OSM ways from Overpass (ODbL): out geometry, i.e. each way has its coordinates and
                                    tags but no node ids; two ways meet where they share a coordinate. The file only
                                    holds NAMED ways (every way has a name), so small unnamed lanes are not in it.
  public/data/villages/<PREFIX>.json  village polygons (scripts/build_villages.py), their union is the district shape

Output: public/data/roads/<PREFIX>.json, one file per district (prefix as in public/data/trees):
  {"district": "大安區", "attribution": "...",
   "nodes": [[lng, lat], ...],                      # junctions and dead ends only, 6 decimals
   "edges": [[a, b, lengthM, [[lng, lat], ...]]]}   # a, b = node indexes; the list is the points between them

Steps:
  1. keep ways a person can walk: drop motorway(_link), elevated or tunnel trunk(_link), construction/proposed,
     bus stops and platforms, busway, and foot=no / access=no|private (unless foot=yes|designated)
  2. node = coordinate rounded to 6 decimals; every pair of consecutive points is a segment (duplicates merged)
  3. per district: keep segments with both ends within BUFFER_M of the district (union of its villages), so a route
     near the border still works; keep the largest connected piece plus any piece of at least KEEP_ISLAND_M
  4. contract nodes of degree 2 into edge polylines (length from the full-resolution points, in metres), then
     simplify the points inside each edge to SIMPLIFY_M

Run:   uv run scripts/build_road_graph.py
Check: uv run scripts/build_road_graph.py --check   (12 files, size budget, indexes, edge lengths)
"""
import json
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np
import shapely
from pyproj import Transformer
from shapely.geometry import LineString, shape

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "material/raw/osm/roads_osm.json"
VILLAGES = ROOT / "public/data/villages"
OUT = ROOT / "public/data/roads"

BUFFER_M = 300
SIMPLIFY_M = 5
KEEP_ISLAND_M = 1000  # besides the largest piece, keep disconnected pieces at least this long (park paths, cut by the buffer)
BUDGET_BYTES = 400_000
EXPECTED_FILES = 12
ATTRIBUTION = "道路與步道：© OpenStreetMap contributors（ODbL 1.0），2026-10-16 下載；只含具名道路，小巷可能沒有"

DROP_HIGHWAY = {
    "motorway", "motorway_link", "construction", "proposed", "bus_stop", "bus_stop;platform", "platform",
    "busway", "elevator", "rest_area", "services", "raceway", "ladder",
}

to_twd97 = Transformer.from_crs(4326, 3826, always_xy=True).transform


def walkable(tags):
    h = tags.get("highway")
    if h in DROP_HIGHWAY:
        return False
    if h in ("trunk", "trunk_link") and (tags.get("bridge") or tags.get("tunnel")):
        return False  # elevated expressways and their ramps
    if tags.get("foot") in ("yes", "designated", "permissive"):
        return True
    return tags.get("foot") != "no" and tags.get("access") not in ("no", "private")


def read_ways():
    """Rounded points per walkable way, as integer micro-degrees (lng, lat)."""
    elements = json.loads(RAW.read_text(encoding="utf-8"))["elements"]
    ways, dropped = [], 0
    for e in elements:
        if e["type"] != "way" or "geometry" not in e or "highway" not in e.get("tags", {}):
            continue
        if not walkable(e["tags"]):
            dropped += 1
            continue
        pts = [(round(p["lon"] * 1e6), round(p["lat"] * 1e6)) for p in e["geometry"]]
        ways.append(pts)
    print(f"ways: {len(elements)} in file, {dropped} not walkable, {len(ways)} kept")
    return ways


def district_shapes():
    """{prefix: (district name, polygon buffered by BUFFER_M, in TWD97 metres)}"""
    out = {}
    for f in sorted(VILLAGES.glob("*.json")):
        d = json.loads(f.read_text(encoding="utf-8"))
        union = shapely.union_all([shape(v["geometry"]) for v in d["villages"]])
        proj = shapely.transform(union, lambda c: np.column_stack(to_twd97(c[:, 0], c[:, 1])))
        out[f.stem] = (d["district"], proj.buffer(BUFFER_M))
    return out


def components(adj):
    """Connected pieces of an adjacency dict, as lists of nodes."""
    seen, pieces = set(), []
    for s in adj:
        if s in seen:
            continue
        seen.add(s)
        stack, piece = [s], []
        while stack:
            u = stack.pop()
            piece.append(u)
            for v in adj[u]:
                if v not in seen:
                    seen.add(v)
                    stack.append(v)
        pieces.append(piece)
    return pieces


def build():
    ways = read_ways()
    # global node table
    index = {}
    for pts in ways:
        for p in pts:
            index.setdefault(p, len(index))
    coords = np.array(list(index.keys()), dtype=np.int64)  # [n, 2] micro-degrees
    lnglat = coords / 1e6
    mx, my = to_twd97(lnglat[:, 0], lnglat[:, 1])
    metres = np.column_stack([mx, my])
    print(f"unique points: {len(coords)}")

    segments = set()
    for pts in ways:
        ids = [index[p] for p in pts]
        for a, b in zip(ids, ids[1:]):
            if a != b:
                segments.add((a, b) if a < b else (b, a))
    segments = np.array(sorted(segments), dtype=np.int64)
    print(f"segments: {len(segments)}")

    shapes = district_shapes()
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.json"):
        old.unlink()
    for prefix, (name, area) in sorted(shapes.items()):
        inside = shapely.contains_xy(area, mx, my)
        seg = segments[inside[segments[:, 0]] & inside[segments[:, 1]]]
        data = contract(prefix, name, seg, lnglat, metres)
        f = OUT / f"{prefix}.json"
        f.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        km = sum(e[2] for e in data["edges"]) / 1000
        pts = sum(len(e[3]) for e in data["edges"])
        print(f"{prefix} {name}: {len(data['nodes'])} nodes, {len(data['edges'])} edges, {pts} inner points, {km:.0f} km, {f.stat().st_size / 1e3:.0f} KB")


def contract(prefix, name, seg, lnglat, metres):
    adj = defaultdict(dict)  # node -> {neighbour: segment length}
    for a, b in seg.tolist():
        d = float(np.hypot(*(metres[a] - metres[b])))
        adj[a][b] = d
        adj[b][a] = d
    # keep the biggest piece, and long enough islands
    pieces = components(adj)
    length_of = lambda p: sum(sum(adj[u].values()) for u in p) / 2
    pieces.sort(key=length_of, reverse=True)
    keep_nodes = set()
    dropped = 0
    for i, p in enumerate(pieces):
        if i == 0 or length_of(p) >= KEEP_ISLAND_M:
            keep_nodes.update(p)
        else:
            dropped += 1
    if dropped:
        print(f"  {prefix}: dropped {dropped} small disconnected pieces")
    adj = {u: nb for u, nb in adj.items() if u in keep_nodes}

    junction = {u for u, nb in adj.items() if len(nb) != 2}
    edges = []  # (a, b, [node ids from a to b])
    walked = set()  # undirected segments already in an edge

    def walk(start, nxt):
        path = [start, nxt]
        walked.add((min(start, nxt), max(start, nxt)))
        while path[-1] not in junction and path[-1] != start:
            u, prev = path[-1], path[-2]
            n = next(v for v in adj[u] if v != prev)
            walked.add((min(u, n), max(u, n)))
            path.append(n)
        return path

    for u in sorted(junction):
        for v in adj[u]:
            if (min(u, v), max(u, v)) in walked:
                continue
            path = walk(u, v)
            edges.append((path[0], path[-1], path))
    # pure cycles (no junction on them): cut at an arbitrary node
    for u in sorted(adj):
        for v in adj[u]:
            if (min(u, v), max(u, v)) in walked:
                continue
            junction.add(u)
            path = walk(u, v)
            edges.append((path[0], path[-1], path))

    node_ids = sorted({e[0] for e in edges} | {e[1] for e in edges})
    new_id = {u: i for i, u in enumerate(node_ids)}
    out_edges = []
    for a, b, path in edges:
        full = metres[path]
        length = float(np.sum(np.hypot(*np.diff(full, axis=0).T)))
        inner = path[1:-1]
        if len(inner) > 1 and a != b:
            line = LineString(full).simplify(SIMPLIFY_M, preserve_topology=False)
            keep = {tuple(c) for c in np.asarray(line.coords)[1:-1].tolist()}
            inner = [p for p, m in zip(inner, full[1:-1].tolist()) if tuple(m) in keep]
        out_edges.append([new_id[a], new_id[b], round(length, 1), [lnglat[p].round(6).tolist() for p in inner]])
    return {
        "district": name,
        "attribution": ATTRIBUTION,
        "nodes": [lnglat[u].round(6).tolist() for u in node_ids],
        "edges": out_edges,
    }


def check():
    ok = True

    def fail(msg):
        nonlocal ok
        ok = False
        print("FAIL", msg)

    files = sorted(OUT.glob("*.json"))
    if len(files) != EXPECTED_FILES:
        fail(f"{len(files)} files, expected {EXPECTED_FILES}")
    for f in files:
        d = json.loads(f.read_text(encoding="utf-8"))
        n = len(d["nodes"])
        if f.stat().st_size >= BUDGET_BYTES:
            fail(f"{f.name} {f.stat().st_size} bytes >= budget {BUDGET_BYTES}")
        if not d.get("attribution") or not d.get("edges"):
            fail(f"{f.name}: attribution/edges")
        for a, b, length, pts in d["edges"]:
            if not (0 <= a < n and 0 <= b < n) or length <= 0:
                fail(f"{f.name}: bad edge {a}-{b} {length}")
                break
    print(("OK" if ok else "NOT OK"), f"{len(files)} files")
    return 0 if ok else 1


if __name__ == "__main__":
    if "--check" in sys.argv:
        sys.exit(check())
    build()
    sys.exit(check())
