# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Download 臺北市受保護樹木 (Taipei protected trees) from data.gov.tw.

Dataset: data.gov.tw/dataset/121274 「臺北市受保護樹木」, 臺北市政府文化局,
政府資料開放授權條款第 1 版. The CSV link is read from the data.gov.tw API
(so a newer edition is picked up); the file is kept as downloaded.

Output (new raw file, never edited by hand): material/raw/protected_trees/protected_trees.csv
  UTF-8 with BOM, WGS84 latitude/longitude with 4 decimals (about 11 m).
  First downloaded 2026-10-20.
Also writes material/raw/protected_trees/source.json (dataset URL, resource URL,
dataset modifiedDate from the API, download date, byte size) for the README.

Run: uv run scripts/fetch_protected_trees.py
"""
import datetime
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

DATASET = "https://data.gov.tw/dataset/121274"
API = "https://data.gov.tw/api/v2/rest/dataset/121274"
OUT_DIR = Path(__file__).resolve().parent.parent / "material/raw/protected_trees"
UA = {"User-Agent": "whisper-trees-demo/1.0 (debug hackathon; protected trees)"}


def get(url: str, timeout: int = 60) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def main() -> int:
    meta = json.loads(get(API))["result"]
    csvs = [d for d in meta["distribution"] if d.get("resourceFormat") == "CSV"]
    if not csvs:
        print("the dataset has no CSV resource", file=sys.stderr)
        return 1
    url = csvs[0]["resourceDownloadUrl"]
    if urllib.parse.urlsplit(url).scheme != "https":
        print(f"refusing a non-https download link: {url}", file=sys.stderr)
        return 1
    print("downloading", url)
    body = get(url, timeout=300)
    head = body.lstrip(b"\xef\xbb\xbf")[:40].decode("utf-8", "replace")
    if "樹木編號" not in head:
        print(f"unexpected content, first bytes: {head!r}", file=sys.stderr)
        return 1
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "protected_trees.csv").write_bytes(body)
    (OUT_DIR / "source.json").write_text(json.dumps({
        "dataset": DATASET,
        "title": meta.get("title"),
        "license": "政府資料開放授權條款第 1 版",
        "resource_url": url,
        "dataset_modified": meta.get("modifiedDate"),
        "downloaded": datetime.date.today().isoformat(),
        "bytes": len(body),
    }, ensure_ascii=False, indent=1) + "\n")
    print(f"wrote {OUT_DIR / 'protected_trees.csv'} ({len(body) / 1e3:.0f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
