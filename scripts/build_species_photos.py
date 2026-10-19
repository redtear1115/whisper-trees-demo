# /// script
# requires-python = ">=3.11"
# dependencies = ["pillow"]
# ///
"""Turn the iNaturalist photos in material/raw/inat/ into web files for the 圖鑑 and the tree page.

Input:   material/raw/inat/manifest.json + the JPEGs (scripts/fetch_inat_photos.py)
Output:  public/data/species-photos/<scientific_slug>/<photo_id>.jpg   max 640 px long edge, JPEG quality 80,
                                                                      no EXIF at all (so no GPS), orientation baked in
         public/data/species-photos/index.json
           { "attribution": "...", "species": { "<中文樹種>": [
               { "src": "<slug>/<id>.jpg",            relative to data/species-photos/
                 "by": "<observer name>",
                 "credit": "© <name>, CC BY" | "CC0 <name>",
                 "licence": "CC BY" | "CC0",
                 "licenceUrl": "https://creativecommons.org/...",
                 "link": "https://www.inaturalist.org/observations/<id>" } ] } }

Run:   uv run scripts/build_species_photos.py
Check: uv run scripts/build_species_photos.py --check   (every file exists, no EXIF, <= 640 px, only CC0/CC BY, size budget)
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "material/raw/inat"
OUT = ROOT / "public/data/species-photos"
MAX_EDGE = 640
QUALITY = 80
BUDGET_MB = 15

LICENCE = {
    "cc0": ("CC0", "https://creativecommons.org/publicdomain/zero/1.0/"),
    "cc-by": ("CC BY", "https://creativecommons.org/licenses/by/4.0/"),
}
NOTE = (
    "照片來自 iNaturalist（https://www.inaturalist.org）的觀察紀錄，只收 CC0 與 CC BY 授權的照片；"
    "每張都標示攝影者、授權與原始觀察連結。照片版權屬各攝影者。"
)


def credit(licence_code: str, name: str) -> str:
    return f"CC0 {name}" if licence_code == "cc0" else f"© {name}, CC BY"


def run() -> None:
    from PIL import Image, ImageOps

    m = json.loads((RAW / "manifest.json").read_text())
    species: dict[str, list[dict]] = {}
    for p in m["photos"]:
        if p["license_code"] not in LICENCE:
            sys.exit(f"refusing licence {p['license_code']!r} on photo {p['photo_id']}")
        src = RAW / p["file"]
        rel = f"{Path(p['file']).parent.name}/{p['photo_id']}.jpg"
        dest = OUT / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(src) as im:
            im = ImageOps.exif_transpose(im).convert("RGB")
            im.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)
            im.save(dest, "JPEG", quality=QUALITY, optimize=True, progressive=True)  # no exif= argument: metadata dropped
        name, url = LICENCE[p["license_code"]]
        species.setdefault(p["species"], []).append(
            {
                "src": rel,
                "by": p["observer_name"],
                "credit": credit(p["license_code"], p["observer_name"]),
                "licence": name,
                "licenceUrl": url,
                "link": p["observation_url"],
            }
        )
    (OUT / "index.json").write_text(json.dumps({"attribution": NOTE, "species": species}, ensure_ascii=False, indent=1) + "\n")
    keep = {OUT / s["src"] for ss in species.values() for s in ss} | {OUT / "index.json"}
    for f in OUT.rglob("*"):  # drop files of photos that left the manifest
        if f.is_file() and f not in keep:
            f.unlink()
    total = sum(f.stat().st_size for f in OUT.rglob("*") if f.is_file())
    print(f"{sum(len(v) for v in species.values())} photos, {len(species)} species -> {OUT.relative_to(ROOT)}  ({total / 1e6:.1f} MB)")


def check() -> int:
    from PIL import Image

    idx = json.loads((OUT / "index.json").read_text())
    errors: list[str] = []
    total = 0
    n = 0
    for zh, ss in idx["species"].items():
        if not ss:
            errors.append(f"{zh}: empty")
        for s in ss:
            n += 1
            f = OUT / s["src"]
            if not f.exists():
                errors.append(f"missing {s['src']}")
                continue
            total += f.stat().st_size
            with Image.open(f) as im:
                if max(im.size) > MAX_EDGE:
                    errors.append(f"{s['src']}: {im.size} larger than {MAX_EDGE}")
                if im.getexif() or "exif" in im.info:
                    errors.append(f"{s['src']}: still has EXIF")
            if s["licence"] not in ("CC0", "CC BY"):
                errors.append(f"{s['src']}: licence {s['licence']!r}")
            if not s["credit"] or not s["by"] or not s["link"].startswith("https://www.inaturalist.org/observations/"):
                errors.append(f"{s['src']}: credit/link missing")
    if total > BUDGET_MB * 1e6:
        errors.append(f"size {total / 1e6:.1f} MB over {BUDGET_MB} MB")
    for e in errors:
        print("FAIL", e)
    print(f"{'OK' if not errors else 'FAILED'}: {n} photos, {len(idx['species'])} species, {total / 1e6:.1f} MB")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(check() if "--check" in sys.argv else (run() or 0))
