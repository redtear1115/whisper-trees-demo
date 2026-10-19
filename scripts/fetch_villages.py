# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Download the village (里) boundaries from 內政部國土測繪中心 (NLSC) open data.

Dataset: data.gov.tw/dataset/7438 「村里界圖(TWD97經緯度)」, 政府資料開放授權條款第 1 版.
The download link is read from the data.gov.tw API (so a newer edition is picked up);
if the API is unreachable the last known TGOS link is used.

Output (new raw file, never edited by hand): material/raw/village/village.zip
  SHP, GCS TWD97[2020] degrees, fields VILLCODE / COUNTYNAME / TOWNNAME / VILLNAME ...
  First downloaded 2026-10-19 (edition VILLAGE_NLSC_1150817, 7,986 villages nationwide).

Run: uv run scripts/fetch_villages.py
"""
import json
import sys
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

API = "https://data.gov.tw/api/v2/rest/dataset/7438"
FALLBACK = "https://www.tgos.tw/tgos/VirtualDir/Product/a04697c8-64db-450a-a105-3eb471c45abd/村(里)界(TWD97經緯度).zip"
OUT = Path(__file__).resolve().parent.parent / "material/raw/village/village.zip"
UA = {"User-Agent": "whisper-trees-demo/1.0 (debug hackathon; village boundaries)"}


def quote(url: str) -> str:
    p = urllib.parse.urlsplit(url)
    return urllib.parse.urlunsplit(p._replace(path=urllib.parse.quote(p.path, safe="/()")))


def resolve_url() -> str:
    try:
        req = urllib.request.Request(API, headers=UA)
        with urllib.request.urlopen(req, timeout=30) as r:
            dist = json.load(r)["result"]["distribution"]
        return next(d["resourceDownloadUrl"] for d in dist if d.get("resourceFormat") == "SHP")
    except Exception as e:  # noqa: BLE001 - any failure falls back to the known link
        print(f"data.gov.tw API failed ({e}); using the known link", file=sys.stderr)
        return FALLBACK


def main() -> int:
    url = resolve_url()
    print("downloading", url)
    req = urllib.request.Request(quote(url), headers=UA)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with urllib.request.urlopen(req, timeout=300) as r:
        OUT.write_bytes(r.read())
    with zipfile.ZipFile(OUT) as z:
        shp = [n for n in z.namelist() if n.upper().startswith("VILLAGE_NLSC") and n.lower().endswith(".shp")]
    if not shp:
        print("zip has no VILLAGE_NLSC_*.shp", file=sys.stderr)
        return 1
    print(f"wrote {OUT} ({OUT.stat().st_size / 1e6:.1f} MB), edition {shp[0]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
