# /// script
# requires-python = ">=3.11"
# dependencies = ["shapely>=2.1", "pyproj", "pyshp", "pandas"]
# ///
"""Build the village (里) boundaries of Taipei, with the number of trees in each, for the 里-level stamp map.

Inputs:
  material/raw/village/village.zip        NLSC 村里界 SHP (scripts/fetch_villages.py), GCS TWD97[2020] degrees
  material/raw/TaipeiTree.csv, TaipeiParkTree.csv   trees (same loader as build_web_data.py, so IDs and
                                          coordinates match public/data/trees)
  src/features/game/districts.ts          PREFIX_DISTRICT (district name -> tree-ID prefix)

Output: public/data/villages/<PREFIX>.json, one file per district (prefix as in public/data/trees):
  {
    "district": "大安區",
    "attribution": "...",
    "villages": [
      {"id": VILLCODE, "name": "仁愛里", "total": 123,        # all real trees inside the village
       "bbox": [minLng, minLat, maxLng, maxLat],
       "geometry": {"type": "Polygon" | "MultiPolygon", "coordinates": [...]}}   # WGS84, 6 decimals
    ]
  }

Steps: keep COUNTYNAME 臺北市 (456 villages), count trees by point-in-polygon on the exact polygons (TWD97 TM2,
metres), then simplify the whole coverage together (shared edges stay shared, SIMPLIFY_M metres) and write.
Trees on a shared edge go to the first village found; trees outside every village (rivers, the city edge) are
counted as `trees_unassigned` and printed.

Run:   uv run scripts/build_villages.py
Check: uv run scripts/build_villages.py --check   (456 villages, 12 files, size budget, shape)
"""
import io
import json
import re
import sys
import zipfile
from pathlib import Path

import numpy as np
import shapefile
import shapely
from pyproj import Transformer
from shapely.geometry import MultiPolygon, Polygon, mapping, shape

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_web_data import load_trees  # noqa: E402  same tree loader as the web data

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "material/raw/village/village.zip"
OUT = ROOT / "public/data/villages"
DISTRICTS_TS = ROOT / "src/features/game/districts.ts"

COUNTY = "臺北市"
EXPECTED_VILLAGES = 456
SIMPLIFY_M = 12
BUDGET_BYTES = 150_000
ATTRIBUTION = "村里界：內政部國土測繪中心（政府資料開放授權條款第 1 版），2026-10-19 下載；樹木數量：臺北市政府開放資料 2026-10-16"

to_twd97 = Transformer.from_crs(4326, 3826, always_xy=True).transform
to_wgs84 = Transformer.from_crs(3826, 4326, always_xy=True).transform


def prefix_districts():
    """PREFIX_DISTRICT in districts.ts as {district name: prefix}."""
    body = re.search(r"PREFIX_DISTRICT[^=]*=\s*\{(.*?)\n\}", DISTRICTS_TS.read_text(encoding="utf-8"), re.S).group(1)
    return {name: prefix for prefix, name in re.findall(r"(\w{2}):\s*'([^']+)'", body)}


def read_villages():
    with zipfile.ZipFile(RAW) as z:
        stem = next(n[:-4] for n in z.namelist() if n.startswith("VILLAGE_NLSC") and n.endswith(".shp"))
        r = shapefile.Reader(
            shp=io.BytesIO(z.read(stem + ".shp")), dbf=io.BytesIO(z.read(stem + ".dbf")), encoding="utf-8"
        )
        rows = []
        for sr in r.iterShapeRecords():
            d = sr.record.as_dict()
            if d["COUNTYNAME"] != COUNTY:
                continue
            rows.append((d["VILLCODE"], d["VILLNAME"], d["TOWNNAME"], shape(sr.shape.__geo_interface__)))
    print(f"edition {stem}: {len(rows)} villages in {COUNTY}")
    return rows


def project(g, fn):
    return shapely.transform(g, lambda c: np.column_stack(fn(c[:, 0], c[:, 1])))


def count_trees(geoms_m, trees):
    """Trees per village (index-aligned with geoms_m) and the number of trees in no village."""
    x, y = to_twd97(trees["lon"].values, trees["lat"].values)
    pts = shapely.points(x, y)
    tree_idx, geom_idx = shapely.STRtree(geoms_m).query(pts, predicate="within")
    first = {}
    for t, g in zip(tree_idx, geom_idx):
        first.setdefault(int(t), int(g))
    counts = [0] * len(geoms_m)
    for g in first.values():
        counts[g] += 1
    return counts, len(pts) - len(first)


def clean(g):
    """Round to 6 decimals (grid snap also keeps the polygon valid) and keep polygons only."""
    g = shapely.set_precision(g, 1e-6)
    if isinstance(g, Polygon):
        return g
    polys = [p for p in getattr(g, "geoms", []) if isinstance(p, Polygon) and not p.is_empty]
    return polys[0] if len(polys) == 1 else MultiPolygon(polys)


def build():
    names = prefix_districts()
    assert len(names) == 12, f"districts.ts should list 12 districts, parsed {len(names)}"
    rows = read_villages()
    assert len(rows) == EXPECTED_VILLAGES, f"expected {EXPECTED_VILLAGES} villages in {COUNTY}, got {len(rows)}"
    unknown = {r[2] for r in rows} - set(names)
    assert not unknown, f"districts without a prefix: {unknown}"

    geoms_m = [project(r[3], to_twd97) for r in rows]
    trees = load_trees()
    counts, unassigned = count_trees(geoms_m, trees)

    simple_m = shapely.coverage_simplify(geoms_m, SIMPLIFY_M)
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.json"):
        old.unlink()
    by_prefix = {}
    for (code, name, town, _), g, total in zip(rows, simple_m, counts):
        geo = clean(project(g, to_wgs84))
        by_prefix.setdefault(names[town], []).append({
            "id": code,
            "name": name,
            "total": total,
            "bbox": [round(v, 6) for v in geo.bounds],
            "geometry": mapping(geo),
        })
    town_of = {v: k for k, v in names.items()}
    for prefix, villages in sorted(by_prefix.items()):
        villages.sort(key=lambda v: v["id"])
        data = {"district": town_of[prefix], "attribution": ATTRIBUTION, "villages": villages}
        f = OUT / f"{prefix}.json"
        f.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        print(f"{prefix} {data['district']}: {len(villages)} villages, {sum(v['total'] for v in villages)} trees, {f.stat().st_size / 1e3:.0f} KB")
    print(f"trees: {len(trees)} total, {len(trees) - unassigned} in a village, trees_unassigned {unassigned}")
    print(f"empty villages (0 trees): {sum(1 for c in counts if c == 0)}")


def check():
    ok = True

    def fail(msg):
        nonlocal ok
        ok = False
        print("FAIL", msg)

    names = prefix_districts()
    files = sorted(OUT.glob("*.json"))
    if {f.stem for f in files} != set(names.values()):
        fail(f"files {[f.stem for f in files]} do not match the 12 prefixes")
    n = 0
    for f in files:
        d = json.loads(f.read_text(encoding="utf-8"))
        if f.stat().st_size >= BUDGET_BYTES:
            fail(f"{f.name} {f.stat().st_size} bytes >= budget {BUDGET_BYTES}")
        if not d.get("attribution") or d.get("district") not in names:
            fail(f"{f.name}: attribution/district")
        for v in d["villages"]:
            n += 1
            g = shape(v["geometry"])
            if g.is_empty or not g.is_valid or v["total"] < 0 or len(v["bbox"]) != 4:
                fail(f"{f.name}: bad village {v['id']} {v['name']}")
    if n != EXPECTED_VILLAGES:
        fail(f"{n} villages, expected {EXPECTED_VILLAGES}")
    print(("OK" if ok else "NOT OK"), f"{n} villages in {len(files)} files")
    return 0 if ok else 1


if __name__ == "__main__":
    if "--check" in sys.argv:
        sys.exit(check())
    build()
    sys.exit(check())
