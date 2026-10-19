# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Download administrative boundaries from OpenStreetMap (Overpass API) for the stamp-book backdrop.

What is fetched (OSM tags checked on 2026-10-19):
  - 臺北市 (relation 1293250), 新北市 (1527220), 基隆市 (1296154): boundary=administrative, admin_level=4
  - Taipei's 12 districts: boundary=administrative, admin_level=7, name one of 松山區 ... 北投區,
    inside the Taipei bounding box (OSM uses level 7 for 區 in Taiwan, not 5)

Output (new raw file, never edited by hand): material/raw/osm/admin_boundaries_osm.json
  Overpass JSON with `out geom` (every relation member way carries its coordinates).
  Data (c) OpenStreetMap contributors, ODbL 1.0.

Run: uv run scripts/fetch_admin_osm.py
"""
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

OVERPASS = "https://overpass-api.de/api/interpreter"
OUT = Path(__file__).resolve().parent.parent / "material/raw/osm/admin_boundaries_osm.json"

QUERY = """[out:json][timeout:180];
(
  relation(id:1293250,1527220,1296154);
  relation["boundary"="administrative"]["admin_level"="7"]
    ["name"~"^(松山|信義|大安|中山|中正|大同|萬華|文山|南港|內湖|士林|北投)區$"](24.9,121.4,25.25,121.7);
);
out geom;
"""


def main() -> int:
    req = urllib.request.Request(
        OVERPASS,
        data=urllib.parse.urlencode({"data": QUERY}).encode(),
        # overpass-api.de answers 406 to requests without a descriptive User-Agent
        headers={"User-Agent": "whisper-trees-demo/1.0 (debug hackathon; admin boundaries)"},
    )
    for attempt in range(6):  # the public instance sometimes answers 502/504 under load
        try:
            with urllib.request.urlopen(req, timeout=240) as r:
                data = json.load(r)
            break
        except urllib.error.HTTPError as e:
            if e.code not in (429, 502, 503, 504) or attempt == 5:
                raise
            print(f"HTTP {e.code}, retrying in {10 * (attempt + 1)} s", file=sys.stderr)
            time.sleep(10 * (attempt + 1))
    names = sorted(e["tags"].get("name", "?") for e in data["elements"])
    if len(names) != 15:
        print(f"expected 15 relations (3 cities + 12 districts), got {len(names)}: {names}", file=sys.stderr)
        return 1
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size / 1e6:.1f} MB): {', '.join(names)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
