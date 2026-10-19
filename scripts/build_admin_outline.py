# /// script
# requires-python = ">=3.11"
# dependencies = ["shapely>=2", "pyproj"]
# ///
"""Build the pre-projected SVG backdrop of Taipei for the stamp book (/stamps).

Input : material/raw/osm/admin_boundaries_osm.json   (scripts/fetch_admin_osm.py; OSM relations, `out geom`)
Output: public/data/taipei-outline.json
  {
    "attribution": "...",
    "viewBox": [w, h],            # 1 unit = UNIT_M metres, y points down, north up
    "taipei": "<path d>",         # outline of the whole city
    "districts": {"中正區": "<path d>", ...},   # 12 districts, keys are the names in src/features/game/districts.ts
    "newtaipei": "<path d>",      # clipped to the frame (Taipei bbox + MARGIN_M)
    "keelung": "<path d>"
  }
Paths use integer coordinates and relative commands (M x y l dx dy ... z), so the file stays small.

Steps: assemble each relation's outer/inner ways into polygons, project WGS84 -> EPSG:3826 (TWD97 / TM2, metres),
clip the neighbours to the frame, simplify (SIMPLIFY_M, in metres) and write the paths.

Run:   uv run scripts/build_admin_outline.py
Check: uv run scripts/build_admin_outline.py --check   (12 districts match districts.ts, size budget, non-empty paths)
"""
import json
import re
import sys
from pathlib import Path

from pyproj import Transformer
from shapely import make_valid
from shapely.geometry import LineString, MultiPolygon, Polygon, box
from shapely.ops import polygonize, unary_union

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "material/raw/osm/admin_boundaries_osm.json"
OUT = ROOT / "public/data/taipei-outline.json"
DISTRICTS_TS = ROOT / "src/features/game/districts.ts"

ATTRIBUTION = "行政區界：© OpenStreetMap contributors（ODbL 1.0），2026-10-19 經 Overpass API 下載"
UNIT_M = 20  # 1 SVG unit = 20 m
MARGIN_M = 4000  # frame = Taipei bounding box + this margin
SIMPLIFY_M = {"taipei": 25, "district": 25, "neighbour": 60}
MIN_AREA_M2 = {"taipei": 200_000, "district": 20_000, "neighbour": 1_000_000}  # drop specks and tiny holes
BUDGET_BYTES = 60_000

CITY_IDS = {"taipei": 1293250, "newtaipei": 1527220, "keelung": 1296154}
to_twd97 = Transformer.from_crs("EPSG:4326", "EPSG:3826", always_xy=True).transform


def rings(members, roles):
    """Closed rings (as polygons) from member ways with the given roles."""
    lines = [
        LineString([to_twd97(p["lon"], p["lat"]) for p in m["geometry"]])
        for m in members
        if m["type"] == "way" and m["role"] in roles and len(m.get("geometry", [])) > 1
    ]
    return unary_union(list(polygonize(unary_union(lines)))) if lines else Polygon()


def relation_shape(rel):
    outer = rings(rel["members"], ("outer", ""))
    inner = rings(rel["members"], ("inner",))
    return make_valid(outer.difference(inner)) if not inner.is_empty else make_valid(outer)


def polygons(g):
    if isinstance(g, Polygon):
        return [g]
    if isinstance(g, MultiPolygon):
        return list(g.geoms)
    return [p for x in getattr(g, "geoms", []) for p in polygons(x)]  # GeometryCollection


def to_path(geom, origin, min_area):
    """Polygon(s) in metres -> compact SVG path (integers, relative lines)."""
    ox, oy = origin
    parts = []
    for poly in polygons(geom):
        if poly.area < min_area:
            continue
        for ring in [poly.exterior, *[r for r in poly.interiors if Polygon(r).area >= min_area]]:
            pts = [(round((x - ox) / UNIT_M), round((oy - y) / UNIT_M)) for x, y in ring.coords[:-1]]
            dedup = [p for i, p in enumerate(pts) if i == 0 or p != pts[i - 1]]
            if len(dedup) < 3:
                continue
            x0, y0 = dedup[0]
            seg = [f"M{x0} {y0}l"]
            px, py = x0, y0
            for x, y in dedup[1:]:
                seg.append(f"{x - px} {y - py}")
                px, py = x, y
            parts.append(" ".join(seg).replace("l ", "l") + "z")
    return "".join(parts)


def district_names():
    """The 12 names in districts.ts (PREFIX_DISTRICT values)."""
    return re.findall(r"'([^']{2}區)'", re.search(r"PREFIX_DISTRICT[^=]*=\s*\{(.*?)\n\}", DISTRICTS_TS.read_text(encoding="utf-8"), re.S).group(1))


def build():
    elements = json.loads(RAW.read_text(encoding="utf-8"))["elements"]
    by_id = {e["id"]: e for e in elements}
    taipei = relation_shape(by_id[CITY_IDS["taipei"]])
    districts = {e["tags"]["name"]: relation_shape(e) for e in elements if e["tags"].get("admin_level") == "7"}

    minx, miny, maxx, maxy = taipei.bounds
    frame = box(minx - MARGIN_M, miny - MARGIN_M, maxx + MARGIN_M, maxy + MARGIN_M)
    origin = (frame.bounds[0], frame.bounds[3])
    w = round((frame.bounds[2] - frame.bounds[0]) / UNIT_M)
    h = round((frame.bounds[3] - frame.bounds[1]) / UNIT_M)

    def simp(g, kind):
        return g.simplify(SIMPLIFY_M[kind], preserve_topology=True)

    out = {
        "attribution": ATTRIBUTION,
        "viewBox": [w, h],
        "taipei": to_path(simp(taipei, "taipei"), origin, MIN_AREA_M2["taipei"]),
        "districts": {n: to_path(simp(g, "district"), origin, MIN_AREA_M2["district"]) for n, g in sorted(districts.items())},
    }
    for key in ("newtaipei", "keelung"):
        clipped = relation_shape(by_id[CITY_IDS[key]]).intersection(frame)
        out[key] = to_path(simp(clipped, "neighbour"), origin, MIN_AREA_M2["neighbour"])

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {OUT.stat().st_size} bytes, viewBox {w}x{h}")


def check():
    data = json.loads(OUT.read_text(encoding="utf-8"))
    ok = True

    def fail(msg):
        nonlocal ok
        ok = False
        print("FAIL", msg)

    want = set(district_names())
    got = set(data["districts"])
    if len(want) != 12:
        fail(f"districts.ts should list 12 districts, parsed {len(want)}")
    if got != want:
        fail(f"district names differ: missing {sorted(want - got)}, extra {sorted(got - want)}")
    for key in ("taipei", "newtaipei", "keelung", *data["districts"]):
        d = data["districts"].get(key) if key in data["districts"] else data.get(key)
        if not d or not d.startswith("M"):
            fail(f"empty or malformed path: {key}")
    size = OUT.stat().st_size
    if size >= BUDGET_BYTES:
        fail(f"{size} bytes >= budget {BUDGET_BYTES}")
    if not data.get("attribution") or "OpenStreetMap" not in data["attribution"]:
        fail("attribution missing")
    print(("OK" if ok else "NOT OK"), f"{len(got)} districts, {size} bytes")
    return 0 if ok else 1


if __name__ == "__main__":
    if "--check" in sys.argv:
        sys.exit(check())
    build()
    sys.exit(check())
