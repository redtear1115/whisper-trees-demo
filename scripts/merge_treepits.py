# /// script
# requires-python = ">=3.11"
# dependencies = ["pandas", "shapely>=2", "pyproj"]
# ///
"""Merge the two Taipei tree pit datasets into one GeoJSON (WGS84).

Inputs (material/raw/):
  treepit_nwo.json     新工處 人行道固定設施物_樹穴, polygons, EPSG:3826
  TaipeiTreeHole.csv   公園處 樹穴資料, points, EPSG:3826
  TaipeiTree.csv       公園處 行道樹 (for the has_tree flag)
  TaipeiParkTree.csv   公園處 公園樹木 (for the has_tree flag)

Output: material/processed/treepits_merged.geojson

Run: uv run scripts/merge_treepits.py
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd
import shapely
from pyproj import Transformer
from shapely import STRtree
from shapely.geometry import mapping, shape

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "material" / "raw"
OUT = ROOT / "material" / "processed" / "treepits_merged.geojson"

MATCH_M = 2.0  # a 公園處 point this close to a 新工處 polygon is the same pit
TREE_M = 1.5  # a registered tree this close to a pit means the pit is occupied
DISTRICTS = {"中正區", "大同區", "中山區", "松山區", "大安區", "萬華區",
             "信義區", "士林區", "北投區", "內湖區", "南港區", "文山區"}


def load_nwo():
    feats = json.loads((RAW / "treepit_nwo.json").read_text())["features"]
    geoms = [shape(f["geometry"]) for f in feats]
    props = pd.DataFrame([f["properties"] for f in feats])
    return geoms, props


def load_pkl():
    """公園處 CSV: rows repeat, and the same pit appears once with a road
    name and once with a district in Region. Collapse to one row per id."""
    df = pd.read_csv(RAW / "TaipeiTreeHole.csv").drop_duplicates()
    df["district"] = df.Region.where(df.Region.isin(DISTRICTS))
    df["road"] = df.Region.where(~df.Region.isin(DISTRICTS))
    first = lambda s: s.dropna().iloc[0] if s.notna().any() else None
    return df.groupby("TreeHoleID", as_index=False).agg(
        ShapeType=("ShapeType", "first"), Length=("Length", "first"),
        Area=("Area", "first"), TWD97X=("TWD97X", "first"),
        TWD97Y=("TWD97Y", "first"), district=("district", first),
        road=("road", first), Remark=("Remark", first),
    )


def load_trees():
    cols = ["TWD97X", "TWD97Y"]
    st = pd.read_csv(RAW / "TaipeiTree.csv", usecols=cols)
    pt = pd.read_csv(RAW / "TaipeiParkTree.csv", usecols=cols)
    xy = pd.concat([st, pt]).dropna()
    return STRtree(shapely.points(xy.TWD97X.values, xy.TWD97Y.values))


def clean(v):
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return None
    return v.item() if isinstance(v, np.generic) else v


def main():
    nwo_geoms, nwo = load_nwo()
    pkl = load_pkl()
    nwo_tree = STRtree(nwo_geoms)

    pkl_pts = shapely.points(pkl.TWD97X.values, pkl.TWD97Y.values)
    near_idx, near_dist = nwo_tree.query_nearest(pkl_pts, return_distance=True, all_matches=False)
    pkl["nwo_idx"] = near_idx[1]
    pkl["nwo_dist"] = near_dist
    matched = pkl[pkl.nwo_dist <= MATCH_M]
    unmatched = pkl[pkl.nwo_dist > MATCH_M]

    # several 公園處 ids can land on one 新工處 polygon
    pkl_by_nwo = matched.groupby("nwo_idx")

    records = []  # (geometry in 3826, properties)
    for i, (g, p) in enumerate(zip(nwo_geoms, nwo.itertuples())):
        rec = {
            "pit_id": f"nwo-{p.OBJECTID}",
            "source": "nwo",
            "kind": p.Name,  # 樹穴 / 花圃
            "shape_type": None,
            "district": p.Town_N,
            "road": None,
            "remark": None,
            "area_m2": round(g.area, 2),
            "perimeter_m": round(g.length, 2),
            "nwo_objectid": int(p.OBJECTID),
            "pkl_treeholeid": None,
        }
        if i in pkl_by_nwo.groups:
            m = pkl_by_nwo.get_group(i)
            rec["source"] = "both"
            rec["pkl_treeholeid"] = ",".join(str(x) for x in m.TreeHoleID)
            rec["shape_type"] = clean(m.ShapeType.iloc[0])
            rec["road"] = clean(m.road.dropna().iloc[0]) if m.road.notna().any() else None
            rec["remark"] = clean(m.Remark.dropna().iloc[0]) if m.Remark.notna().any() else None
        records.append((g, rec))

    for p in unmatched.itertuples():
        g = shapely.Point(p.TWD97X, p.TWD97Y)
        inferred = pd.isna(p.district)  # fall back to the nearest 新工處 pit's district
        records.append((g, {
            "pit_id": f"pkl-{p.TreeHoleID}",
            "source": "pkl",
            "kind": "樹穴",
            "shape_type": clean(p.ShapeType),
            "district": nwo.Town_N.iloc[p.nwo_idx] if inferred else p.district,
            "district_inferred": bool(inferred),
            "road": clean(p.road),
            "remark": clean(p.Remark),
            "area_m2": clean(p.Area),
            "perimeter_m": clean(p.Length),  # CSV Length behaves like a perimeter (Area/Length ~ 0.5)
            "nwo_objectid": None,
            "pkl_treeholeid": str(p.TreeHoleID),
        }))

    # occupancy: a polygon is checked by its outline, a point by a TREE_M circle
    trees = load_trees()
    geoms = [g for g, _ in records]
    probe = [g.buffer(TREE_M) for g in geoms]
    hits = trees.query(probe, predicate="intersects")
    has_tree = np.zeros(len(geoms), bool)
    has_tree[np.unique(hits[0])] = True

    to_wgs = Transformer.from_crs(3826, 4326, always_xy=True)
    wgs = shapely.transform(
        np.array(geoms, dtype=object),
        lambda xy: np.column_stack(to_wgs.transform(xy[:, 0], xy[:, 1])),
    )
    wgs = shapely.set_precision(wgs, 1e-7)  # ~1 cm, keeps the file small
    features = []
    for g, (_, rec), occupied in zip(wgs, records, has_tree):
        if g.is_empty:  # zero-area source polygons
            print("skip empty geometry:", rec["pit_id"])
            continue
        rec["has_tree"] = bool(occupied)
        features.append({
            "type": "Feature",
            "properties": {k: clean(v) for k, v in rec.items()},
            "geometry": mapping(g),
        })

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(
        {"type": "FeatureCollection", "features": features},
        ensure_ascii=False, separators=(",", ":"),
    ))

    src = pd.Series([f["properties"]["source"] for f in features])
    empty = pd.Series([not f["properties"]["has_tree"] for f in features])
    kind = pd.Series([f["properties"]["kind"] for f in features])
    print(f"公園處 pits after dedupe: {len(pkl)}; matched to 新工處 within {MATCH_M} m: "
          f"{len(matched)} -> {matched.nwo_idx.nunique()} polygons; added as new: {len(unmatched)}")
    print("features by source:", src.value_counts().to_dict(), "total", len(features))
    print(f"no registered tree within {TREE_M} m:", int(empty.sum()),
          "| 樹穴 only:", int((empty & (kind == "樹穴")).sum()))
    print("empty by source:", src[empty].value_counts().to_dict())
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
