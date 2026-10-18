# /// script
# requires-python = ">=3.11"
# dependencies = ["pandas", "pyproj", "shapely>=2"]
# ///
"""Build the static data the web app reads (public/data/).

Inputs:
  material/raw/TaipeiTree.csv, TaipeiParkTree.csv   trees, TWD97
  material/processed/treepits_merged.geojson         pits, WGS84
  material/raw/sidewalk.json                         sidewalks, EPSG:3826

Outputs (public/data/):
  trees/<prefix>.json   TreeID lookup, split by the first 2 letters
  tree-tiles/           tree points for the map, {z}/{x}/{y}.pbf (needs tippecanoe)
  pits-empty.geojson    candidate empty pits (kind 樹穴, has_tree false)
  districts.json        street trees per km of sidewalk, per district
  species.json          tree count per species (for the codex)
  parks.geojson         OSM park outlines (ODbL), simplified
  ../api/v1/            static open API: index, districts, species, and a
                        mock wishes snapshot (from src/mock/, marked mock)

Run: uv run scripts/build_web_data.py [--force-tiles]
"""
import json
import shutil
import sys
import subprocess
import tempfile
from pathlib import Path

import pandas as pd
import shapely
from pyproj import Transformer
from shapely.geometry import shape

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "material" / "raw"
PROCESSED = ROOT / "material" / "processed"
OUT = ROOT / "public" / "data"

# 內政部鄉鎮市區代碼 → 行政區 (sidewalk.json Town_N)
TOWN = {
    "63000010": "松山區", "63000020": "信義區", "63000030": "大安區",
    "63000040": "中山區", "63000050": "中正區", "63000060": "大同區",
    "63000070": "萬華區", "63000080": "文山區", "63000090": "南港區",
    "63000100": "內湖區", "63000110": "士林區", "63000120": "北投區",
}


def num(v):
    return None if pd.isna(v) else round(float(v), 1)


def text(v):
    return "" if pd.isna(v) else str(v).strip()


def load_trees():
    street = pd.read_csv(RAW / "TaipeiTree.csv", dtype={"TreeID": str})
    street["kind"] = "street"
    street["place"] = street["Region"]
    park = pd.read_csv(RAW / "TaipeiParkTree.csv", dtype={"TreeID": str})
    park["kind"] = "park"
    park["place"] = park["ParkName"]
    park["RegionRemark"] = ""
    cols = ["TreeID", "Dist", "place", "RegionRemark", "TreeType", "Diameter",
            "TreeHeight", "SurveyDate", "TWD97X", "TWD97Y", "kind"]
    df = pd.concat([street[cols], park[cols]], ignore_index=True)
    df["TreeID"] = df["TreeID"].str.strip()
    assert df["TreeID"].is_unique, "TreeID must be unique"
    tf = Transformer.from_crs(3826, 4326, always_xy=True)
    df["lon"], df["lat"] = tf.transform(df["TWD97X"].values, df["TWD97Y"].values)
    df["lon"] = df["lon"].round(6)
    df["lat"] = df["lat"].round(6)
    df["TreeType"] = df["TreeType"].fillna("未知").str.strip()
    return df


def build_lookup(df):
    out = OUT / "trees"
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob("*.json"):
        old.unlink()
    df = df.assign(prefix=df["TreeID"].str[:2])
    for prefix, g in df.groupby("prefix"):
        species = sorted(g["TreeType"].unique())
        index = {s: i for i, s in enumerate(species)}
        trees = {
            r.TreeID: [r.lon, r.lat, index[r.TreeType], num(r.Diameter),
                       num(r.TreeHeight), text(r.place), text(r.RegionRemark),
                       r.kind, text(r.SurveyDate), text(r.Dist)]
            for r in g.itertuples()
        }
        data = {"species": species, "trees": trees}
        (out / f"{prefix}.json").write_text(
            json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    print(f"lookup: {len(df)} trees in {df['prefix'].nunique()} files")


def build_tiles(df):
    """Static vector tiles ({z}/{x}/{y}.pbf). Cloudflare Pages does not serve
    HTTP Range requests, so a single PMTiles file cannot be read from it."""
    target = OUT / "tree-tiles"
    stamp = target / "metadata.json"
    sources = [RAW / "TaipeiTree.csv", RAW / "TaipeiParkTree.csv"]
    if (stamp.exists() and "--force-tiles" not in sys.argv
            and stamp.stat().st_mtime > max(p.stat().st_mtime for p in sources)):
        # tippecanoe 每次輸出的位元組略有不同；資料沒變就不重做，避免版控裡空轉
        print("tiles: up to date (--force-tiles to rebuild)")
        return
    if not shutil.which("tippecanoe"):
        raise SystemExit("tippecanoe not found: brew install tippecanoe")
    shutil.rmtree(target, ignore_errors=True)
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / "trees.geojsonl"
        with src.open("w") as f:
            for r in df.itertuples():
                f.write(json.dumps({
                    "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [r.lon, r.lat]},
                    "properties": {"id": r.TreeID, "k": r.kind[0]},
                }, ensure_ascii=False) + "\n")
        subprocess.run([
            "tippecanoe", "-e", str(target), "--force", "-l", "trees",
            "--name=trees", "--description=臺北市行道樹與公園樹木（臺北市政府開放資料 2026-10-16）",
            "-Z10", "-z16", "--drop-densest-as-needed",
            "--extend-zooms-if-still-dropping", "-r1",
            "--no-tile-compression", "--maximum-tile-bytes=500000",
            str(src),
        ], check=True, capture_output=True)
    tiles = list(target.rglob("*.pbf"))
    size = sum(t.stat().st_size for t in tiles)
    print(f"tiles: {len(tiles)} files, {size / 1e6:.1f} MB")


def build_pits(df):
    street = df[df["kind"] == "street"]
    # Rough local metres; good enough for a nearest-road lookup within 50 m.
    tree_pts = shapely.points(street["lon"].values * 101000, street["lat"].values * 111000)
    tree_index = shapely.STRtree(tree_pts)
    feats = json.loads((PROCESSED / "treepits_merged.geojson").read_text())["features"]
    out = []
    for f in feats:
        p = f["properties"]
        if p["kind"] != "樹穴" or p["has_tree"]:
            continue
        g = shape(f["geometry"])
        pt = g if g.geom_type == "Point" else g.centroid
        props = {k: p.get(k) for k in ("pit_id", "district", "road", "area_m2", "source")}
        if not props["road"]:
            near = tree_index.query_nearest(
                shapely.Point(pt.x * 101000, pt.y * 111000), max_distance=50)
            if len(near):
                props["road"] = text(street["place"].iloc[near[0]])
                props["road_inferred"] = True
        out.append({
            "type": "Feature",
            "geometry": {"type": "Point",
                         "coordinates": [round(pt.x, 6), round(pt.y, 6)]},
            "properties": props,
        })
    (OUT / "pits-empty.geojson").write_text(json.dumps(
        {"type": "FeatureCollection", "features": out},
        ensure_ascii=False, separators=(",", ":")))
    named = sum(1 for f in out if f["properties"]["road"])
    print(f"pits: {len(out)} empty, {named} with a road name")
    return out


def build_districts(df, pits):
    sw = json.loads((RAW / "sidewalk.json").read_text())["features"]
    length = {}
    for f in sw:
        p = f["properties"]
        d = TOWN.get(str(p.get("Town_N")))
        if d and p.get("SW_LENG_ItemValue"):
            length[d] = length.get(d, 0) + float(p["SW_LENG_ItemValue"])
    street = df[df["kind"] == "street"].groupby("Dist").size()
    allt = df.groupby("Dist").size()
    pit_count = pd.Series([p["properties"]["district"] for p in pits]).value_counts()
    rows = []
    for d in TOWN.values():
        km = length.get(d, 0) / 1000
        rows.append({
            "district": d,
            "street_trees": int(street.get(d, 0)),
            "all_trees": int(allt.get(d, 0)),
            "sidewalk_km": round(km, 1),
            "trees_per_km": round(street.get(d, 0) / km, 1) if km else None,
            "empty_pits": int(pit_count.get(d, 0)),
        })
    rows.sort(key=lambda r: -(r["trees_per_km"] or 0))
    (OUT / "districts.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1))
    for r in rows:
        print(f"  {r['district']} {r['trees_per_km']}/km  pits {r['empty_pits']}")


def build_parks():
    """OSM park outlines (ODbL), for the map's park layer."""
    src = json.loads((PROCESSED / "parks_boundary.geojson").read_text())
    for f in src["features"]:
        g = shape(f["geometry"]).simplify(0.00002)
        f["geometry"] = shapely.geometry.mapping(g)
        f["properties"] = {k: f["properties"].get(k) for k in ("pm_name", "method", "ratio") if k in f["properties"]}
    (OUT / "parks.geojson").write_text(json.dumps(src, ensure_ascii=False, separators=(",", ":")))
    print(f"parks: {len(src['features'])} outlines")


def build_species(df):
    g = df.groupby("TreeType")
    rows = [
        {"species": sp, "count": int(len(t)), "street": int((t["kind"] == "street").sum()),
         "park": int((t["kind"] == "park").sum())}
        for sp, t in g
    ]
    rows.sort(key=lambda r: -r["count"])
    (OUT / "species.json").write_text(json.dumps(rows, ensure_ascii=False, separators=(",", ":")))
    print(f"species: {len(rows)}, top: {rows[0]['species']} {rows[0]['count']}")


def build_api():
    """Static open API. Real data is copied from public/data/; wishes are mock."""
    api = ROOT / "public" / "api" / "v1"
    api.mkdir(parents=True, exist_ok=True)
    for name in ("districts.json", "species.json"):
        shutil.copyfile(OUT / name, api / name)
    seed = json.loads((ROOT / "src" / "mock" / "wishes.json").read_text())
    labels = {"received": "已收件", "surveying": "會勘中", "scheduled": "可種・已排程",
              "planted": "已種植", "rejected": "不可種"}
    wishes = []
    for w in seed:
        last = w["history"][-1]
        wishes.append({
            "id": w["id"], "pit_id": w["pitId"], "lng": w["lngLat"][0], "lat": w["lngLat"][1],
            "road": w["road"], "district": w["district"], "reasons": w["reasons"],
            "waterings": w["seedWater"], "status": last[0], "status_label": labels[last[0]],
            **({"reason": last[2]} if len(last) > 2 else {}),
        })
    (api / "wishes.json").write_text(json.dumps(
        {"mock": True, "note": "模擬資料：示範用的許願與補種進度", "wishes": wishes},
        ensure_ascii=False, indent=1))
    index = {
        "name": "曦語 Whisper Trees 開放資料 API（示範）",
        "version": "v1",
        "data_date": "2026-10-16",
        "license": "政府資料開放授權條款第 1 版；OSM 衍生資料 ODbL 1.0",
        "endpoints": {
            "trees": "/data/trees/{prefix}.json",
            "tree_tiles": "/data/tree-tiles/{z}/{x}/{y}.pbf",
            "pits_empty": "/data/pits-empty.geojson",
            "districts": "/api/v1/districts.json",
            "species": "/api/v1/species.json",
            "wishes": "/api/v1/wishes.json",
        },
    }
    (api / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1))
    print(f"api: {len(index['endpoints'])} endpoints")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    df = load_trees()
    check = df.set_index("TreeID").loc["SL0560111023"]
    print(f"check SL0560111023: {check['place']} {check['lon']},{check['lat']}")
    build_lookup(df)
    pits = build_pits(df)
    build_districts(df, pits)
    build_species(df)
    build_parks()
    build_api()
    build_tiles(df)


if __name__ == "__main__":
    main()
