# /// script
# requires-python = ">=3.11"
# dependencies = ["pandas", "shapely>=2", "pyproj"]
# ///
"""Give each Taipei park (公園處 公園基本資料) a boundary polygon from OpenStreetMap.

The official dataset only has a centre point. Matching runs in three passes:
  1. name   : an OSM park with the same name within NAME_M of the official point
  2. contains: the official point lies inside an OSM park polygon
  3. intersection: parse road names out of pm_location ("光明路、中山路交叉口"),
     find where those roads meet in OSM, and take the OSM park next to that point.
     This also re-checks same-name parks whose official point is far away.

Inputs:  material/raw/parks.json, material/raw/osm/parks_osm.json, material/raw/osm/roads_osm.json
Outputs: material/processed/parks_osm_match.csv
         material/processed/parks_boundary.geojson  (OSM geometry, ODbL)

Run: uv run scripts/match_parks_osm.py
"""
import json
import re
from pathlib import Path

import numpy as np
import pandas as pd
import shapely
from pyproj import Transformer
from shapely import STRtree
from shapely.geometry import LineString, Polygon, mapping
from shapely.ops import nearest_points

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "material" / "raw"
OUT_CSV = ROOT / "material" / "processed" / "parks_osm_match.csv"
OUT_GEO = ROOT / "material" / "processed" / "parks_boundary.geojson"

NAME_M = 80  # same-name OSM park this close to the official point is accepted
NEAR_ROADS_M = 25  # two roads this close count as meeting
CORNER_M = 60  # an OSM park this close to the road meeting point is a candidate
AREA_OK = (0.5, 2.0)  # OSM area / official area accepted without a name match

to3826 = Transformer.from_crs(4326, 3826, always_xy=True)
to4326 = Transformer.from_crs(3826, 4326, always_xy=True)
CN = "〇一二三四五六七八九"


def norm_name(s):
    return re.sub(r"[、，,\s()（）]|綠地|公園|廣場", "", str(s))


def project(coords):
    xs, ys = to3826.transform([p["lon"] for p in coords], [p["lat"] for p in coords])
    return list(zip(xs, ys))


def load_osm_parks():
    rows = []
    for e in json.loads((RAW / "osm" / "parks_osm.json").read_text())["elements"]:
        poly = None
        if e["type"] == "way" and len(e.get("geometry", [])) >= 4 and e["geometry"][0] == e["geometry"][-1]:
            poly = Polygon(project(e["geometry"])).buffer(0)
        elif e["type"] == "relation":
            # multipolygon rings are often split over several ways: stitch them back together
            def rings(role):
                lines = [LineString(project(m["geometry"])) for m in e.get("members", [])
                         if m.get("role") == role and len(m.get("geometry") or []) >= 2]
                return shapely.union_all(list(shapely.polygonize(lines).geoms)) if lines else None
            outer, inner = rings("outer"), rings("inner")
            if outer is not None and not outer.is_empty:
                poly = outer.difference(inner) if inner is not None else outer
        if poly is not None and poly.area > 0:
            tags = e.get("tags", {})
            rows.append({"osm_id": f"{e['type']}/{e['id']}", "osm_name": tags.get("name", ""),
                         "leisure": tags.get("leisure"), "geom": poly})
    return pd.DataFrame(rows)


def load_osm_roads():
    lines = {}
    for e in json.loads((RAW / "osm" / "roads_osm.json").read_text())["elements"]:
        g = e.get("geometry")
        if e["type"] != "way" or not g or len(g) < 2:
            continue
        name = e["tags"]["name"].replace("臺", "台")
        lines.setdefault(name, []).append(LineString(project(g)))
    return {k: shapely.multilinestrings(v) for k, v in lines.items()}


def parse_roads(loc):
    """Road names in a location string, in OSM spelling (中文 段 numbers)."""
    s = str(loc).replace("臺", "台").replace("．", ".")
    s = re.sub(r"^台北市", "", s)
    s = re.sub(r"(\d)段", lambda m: CN[int(m.group(1))] + "段", s)
    s = re.sub(r"[^、，,。()（）\s]*?[區里](?=[^\s、，,]*?(路|街|大道))", "", s)  # drop 區/里 prefixes
    # connectors and sides would otherwise be read as the start of the next road name
    s = re.sub(r"[東西南北]側|以[東西南北]|[與及和至到起迄間旁上前後對面口/.]", "、", s)
    found = []
    pat = re.compile(r"([一-鿿]{1,6}?(?:路|街|大道)(?:[一二三四五六七八九十]段)?)((?:\d+巷)?(?:\d+弄)?)|(\d+巷)")
    base = None
    for m in pat.finditer(s):
        if m.group(1):
            base = m.group(1)
            found.append(base + m.group(2))
        elif base:  # "525巷及517巷": a lane with its road left out
            found.append(base + m.group(3))
    return list(dict.fromkeys(found))


def road_geom(token, roads):
    if token in roads:
        return roads[token]
    if "巷" not in token and "段" not in token:  # 中山北路 -> every 中山北路X段
        parts = [g for n, g in roads.items() if re.fullmatch(re.escape(token) + r"[一二三四五六七八九十]段", n)]
        if parts:
            return shapely.union_all(parts)
    if "巷" in token:  # fall back to the road the lane opens onto
        return road_geom(re.sub(r"\d+巷.*$", "", token), roads)
    return None


def meeting_points(tokens, roads):
    geoms = [(t, road_geom(t, roads)) for t in tokens]
    geoms = [(t, g) for t, g in geoms if g is not None]
    pts = []
    for i in range(len(geoms)):
        for j in range(i + 1, len(geoms)):
            a, b = geoms[i][1], geoms[j][1]
            x = a.intersection(b)
            if not x.is_empty:
                pts.extend(shapely.get_parts(shapely.points(shapely.get_coordinates(x))))
            elif a.distance(b) <= NEAR_ROADS_M:
                p, q = nearest_points(a, b)
                pts.append(shapely.Point((p.x + q.x) / 2, (p.y + q.y) / 2))
    return pts, [t for t, _ in geoms]


def main():
    pk = pd.DataFrame(json.loads((RAW / "parks.json").read_text()))
    osm = load_osm_parks()
    roads = load_osm_roads()
    tree = STRtree(osm.geom.values)
    osm["key"] = osm.osm_name.map(norm_name)

    x, y = to3826.transform(pk.pm_Longitude.astype(float).values, pk.pm_Latitude.astype(float).values)
    pts = shapely.points(x, y)
    area = pd.to_numeric(pk.pm_LandPublicArea, errors="coerce").values

    out = []
    for i, p in enumerate(pts):
        key = norm_name(pk.pm_name[i])
        rec = {"SeqNo": pk.SeqNo[i], "pm_name": pk.pm_name[i], "pm_type": pk.pm_type[i],
               "pm_location": pk.pm_location[i], "area_official": area[i],
               "method": None, "osm_idx": None, "dist_m": np.nan, "roads": "", "corner_found": False}
        same = osm.index[(osm.key == key) & (key != "")]
        near_same = [j for j in same if osm.geom[j].distance(p) <= NAME_M]
        if near_same:
            rec.update(method="name", osm_idx=min(near_same, key=lambda j: osm.geom[j].distance(p)))
        else:
            inside = [j for j in tree.query(p, predicate="within")]
            if inside:
                rec.update(method="contains", osm_idx=min(inside, key=lambda j: osm.geom[j].area))

        tokens = parse_roads(pk.pm_location[i])
        if "巷口" in str(pk.pm_location[i]):  # a lane mouth: where the lane meets its road
            tokens += [re.sub(r"\d+巷.*$", "", t) for t in tokens if "巷" in t]
            tokens = list(dict.fromkeys(tokens))
        corners, used = meeting_points(tokens, roads) if len(tokens) >= 2 else ([], [])
        rec["roads"] = "、".join(used)
        rec["corner_found"] = bool(corners)
        if rec["method"] is None and corners:
            cand = set()
            for c in corners:
                cand.update(tree.query(c.buffer(CORNER_M)).tolist())
            dist = {j: min(osm.geom[j].distance(c) for c in corners) for j in cand}
            named = [j for j in cand if osm.key[j] == key and key]
            sized = [j for j in cand if area[i] > 0 and AREA_OK[0] <= osm.geom[j].area / area[i] <= AREA_OK[1]]
            if named:
                rec.update(method="intersection+name", osm_idx=min(named, key=dist.get))
            elif sized:
                rec.update(method="intersection+area", osm_idx=min(sized, key=dist.get))
        if rec["osm_idx"] is not None:
            rec["dist_m"] = round(osm.geom[rec["osm_idx"]].distance(p), 1)
        out.append(rec)

    r = pd.DataFrame(out)
    m = r.osm_idx.notna()
    r.loc[m, "osm_id"] = osm.osm_id[r.osm_idx[m].astype(int)].values
    r.loc[m, "osm_name"] = osm.osm_name[r.osm_idx[m].astype(int)].values
    r.loc[m, "area_osm"] = [round(osm.geom[int(j)].area) for j in r.osm_idx[m]]
    r["ratio"] = (r.area_osm / r.area_official).round(2)

    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    r.drop(columns="osm_idx").to_csv(OUT_CSV, index=False)

    feats = []
    for rec in r[m].itertuples():
        g = osm.geom[int(rec.osm_idx)]
        g = shapely.transform(g, lambda xy: np.column_stack(to4326.transform(xy[:, 0], xy[:, 1])))
        g = shapely.set_precision(g, 1e-7)
        feats.append({"type": "Feature", "geometry": mapping(g), "properties": {
            "SeqNo": rec.SeqNo, "pm_name": rec.pm_name, "method": rec.method,
            "osm_id": rec.osm_id, "osm_name": rec.osm_name,
            "area_official": None if np.isnan(rec.area_official) else rec.area_official,
            "area_osm": rec.area_osm, "ratio": None if np.isnan(rec.ratio) else rec.ratio}})
    OUT_GEO.write_text(json.dumps({
        "type": "FeatureCollection",
        "attribution": "Park boundaries © OpenStreetMap contributors, ODbL 1.0",
        "features": feats}, ensure_ascii=False, separators=(",", ":")))

    print("parks:", len(r), "| matched:", int(m.sum()))
    print("by method:", r.method.value_counts().to_dict())
    print("with >=2 roads parsed:", int((r.roads.str.count("、") >= 1).sum()),
          "| road meeting point found:", int(r.corner_found.sum()))
    ok = r.ratio.between(0.8, 1.25)
    print("area within ±20% by method:", r[m].groupby("method").apply(lambda d: f"{ok[d.index].mean():.0%}").to_dict())
    print(f"wrote {OUT_CSV.relative_to(ROOT)}, {OUT_GEO.relative_to(ROOT)} ({len(feats)} polygons)")


if __name__ == "__main__":
    main()
