# /// script
# requires-python = ">=3.11"
# dependencies = ["pandas", "pyproj", "shapely>=2"]
# ///
"""Match 臺北市受保護樹木 to 公園處 TreeIDs, for the 'protected tree' light-point rule.

Inputs:
  material/raw/protected_trees/protected_trees.csv   data.gov.tw/dataset/121274, UTF-8 BOM,
                                                     WGS84 degrees with 4 decimals (about 11 m)
  material/raw/protected_trees/source.json           download date (written by fetch_protected_trees.py)
  material/raw/TaipeiTree.csv, TaipeiParkTree.csv    via build_web_data.load_trees()

Output: public/data/protected-trees.json
  { attribution, source, generated, method, trees: [{treeId, protectedNo, species, distanceM, match}] }

The protected-tree list has no 公園處 TreeID, so each protected tree is matched by position:
  1. 'species': nearest 公園處 tree of the same species within SPECIES_M metres
  2. 'near':    for what is left, the nearest free tree of any species within NEAR_M metres
Both passes are greedy by distance and one-to-one (a protected tree takes at most one TreeID and a
TreeID is taken by at most one protected tree). TreeIDs are whole strings, -001 suffixes included.
The coordinates are rounded to 4 decimals (up to about 7 m off), which is why the species radius is 8 m.
Unmatched trees are mostly on private, school or temple land without a 公園處 tag.

Run: uv run scripts/build_protected_trees.py [--check]
  --check  rebuild in memory and compare with public/data/protected-trees.json; exit 1 on any difference
"""
import json
import re
import sys
from pathlib import Path

import pandas as pd
import shapely
from pyproj import Transformer

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_web_data import load_trees  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "material" / "raw" / "protected_trees"
OUT = ROOT / "public" / "data" / "protected-trees.json"

SPECIES_M = 8.0
NEAR_M = 3.0

# 受保護名冊與公園處用的名稱不同、但是同一種樹
ALIAS = {"榕": "榕樹", "樟": "樟樹", "垂葉榕": "垂榕"}


def norm_species(name: str) -> str:
    s = re.sub(r"[\s（(].*$", "", str(name).strip())  # 「月橘 (七里香)」→「月橘」
    s = s.replace("台", "臺")
    return ALIAS.get(s, s)


def greedy(pairs, taken_p, taken_t):
    """pairs: (distance, protected index, tree index), one-to-one by increasing distance."""
    out = []
    for d, i, j in sorted(pairs):
        if i in taken_p or j in taken_t:
            continue
        taken_p.add(i)
        taken_t.add(j)
        out.append((i, j, d))
    return out


def build():
    trees = load_trees()
    prot = pd.read_csv(RAW / "protected_trees.csv", encoding="utf-8-sig")
    meta = json.loads((RAW / "source.json").read_text())
    assert prot["樹木編號"].is_unique, "protected tree numbers must be unique"
    # 受保護名冊是 WGS84；公園處樹木用 TWD97 (EPSG:3826)，在公尺座標系裡算距離
    x, y = Transformer.from_crs(4326, 3826, always_xy=True).transform(
        prot["經度"].values, prot["緯度"].values)
    pp = shapely.points(x, y)
    tp = shapely.points(trees["TWD97X"].values, trees["TWD97Y"].values)
    index = shapely.STRtree(tp)
    p_species = prot["樹種名稱"].map(norm_species).values
    t_species = trees["TreeType"].map(norm_species).values

    i, j = index.query(pp, predicate="dwithin", distance=SPECIES_M)
    dist = shapely.distance(pp[i], tp[j])
    taken_p, taken_t = set(), set()
    by_species = greedy(
        [(d, a, b) for a, b, d in zip(i, j, dist) if p_species[a] == t_species[b]],
        taken_p, taken_t)
    i, j = index.query(pp, predicate="dwithin", distance=NEAR_M)
    dist = shapely.distance(pp[i], tp[j])
    by_near = greedy([(d, a, b) for a, b, d in zip(i, j, dist)], taken_p, taken_t)

    rows = []
    for kind, found in (("species", by_species), ("near", by_near)):
        for a, b, d in found:
            rows.append({
                "treeId": str(trees["TreeID"].iloc[b]),
                "protectedNo": int(prot["樹木編號"].iloc[a]),
                "species": str(prot["樹種名稱"].iloc[a]).strip(),
                "distanceM": round(float(d), 1),
                "match": kind,
            })
    rows.sort(key=lambda r: r["protectedNo"])
    assert len({r["treeId"] for r in rows}) == len(rows), "a TreeID was used twice"
    out = {
        "attribution": "臺北市政府文化局「臺北市受保護樹木」，政府資料開放授權條款第 1 版；"
                       "與臺北市政府工務局公園處樹木資料依位置比對",
        "source": meta["dataset"],
        "generated": meta["downloaded"],
        "method": f"同樹種 {SPECIES_M:g} 公尺內最近者（match=species）；其餘 {NEAR_M:g} 公尺內最近者不論樹種"
                  "（match=near）；一對一",
        "trees": rows,
    }
    return out, len(prot), by_species, by_near


def main() -> int:
    out, total, by_species, by_near = build()
    text = json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n"
    matched = len(out["trees"])
    print(f"protected trees: {total}")
    print(f"matched: {matched} (species {len(by_species)}, near {len(by_near)})")
    print(f"unmatched: {total - matched} (private / school / temple land without a 公園處 tag, or outside the radius)")
    print(f"size: {len(text.encode()) / 1e3:.1f} KB")
    if "--check" in sys.argv:
        if not OUT.exists() or OUT.read_text() != text:
            print(f"CHECK FAILED: {OUT.relative_to(ROOT)} differs from a fresh build", file=sys.stderr)
            return 1
        print("check ok: output is up to date")
        return 0
    OUT.write_text(text)
    print(f"wrote {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
