# /// script
# requires-python = ">=3.11"
# dependencies = ["requests"]
# ///
"""Download a few openly licensed tree photos per species from iNaturalist, for the 圖鑑 and the tree page.

Rules:
  * source: iNaturalist only (official API v1, https://api.inaturalist.org/v1/docs)
  * licences: CC0 and CC BY only. No CC BY-NC / BY-SA / ND, no all-rights-reserved.
    The filter `photo_license` on /observations only means "has AT LEAST ONE photo with this licence", so every
    photo's own `license_code` is checked again here. Hidden or flagged photos are skipped.
  * 4-6 photos per species, at most one per observer (variety: also spread over plant-phenology annotations).
  * research-grade observations, place = Taiwan (place_id 7887, the country-level "Taiwan" place), most-voted first.
    Only if Taiwan has fewer than MIN_PHOTOS eligible photos, the shortfall is filled from the rest of the world
    (each photo records `scope`); species that still end up below MIN_PHOTOS are listed in manifest `summary.short`.
  * etiquette: descriptive User-Agent, <= 1 API request per second, every API response cached in
    material/raw/inat/_cache/ (git-ignored), images downloaded once.

Species list: the first 40 rows of public/data/species.json (what the 圖鑑 lists as the commonest). The open data has
no scientific names, so SCIENTIFIC below is a hand-made mapping (Chinese name used by the 公園處 -> scientific name);
the script prints the iNaturalist taxon it resolved and its zh-TW common name so a human can sanity-check it.

Output:
  material/raw/inat/<scientific_name_slug>/<photo_id>.jpg    "medium" size (~500 px)
  material/raw/inat/manifest.json                            one entry per photo + summary

Run:   uv run scripts/fetch_inat_photos.py
Check: uv run scripts/fetch_inat_photos.py --check   (offline: every manifest entry is cc0/cc-by, 4-6 per species or listed as short, files exist)
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPECIES_JSON = ROOT / "public/data/species.json"
OUT = ROOT / "material/raw/inat"
CACHE = OUT / "_cache"
MANIFEST = OUT / "manifest.json"

API = "https://api.inaturalist.org/v1"
UA = "WhisperTreesDemo/0.1 (Taipei city debug hackathon, species photos for a demo; contact vfgcees@gmail.com)"
MIN_INTERVAL = 1.1  # seconds between API requests (iNaturalist asks for <= 1/s)
TAIWAN_PLACE_ID = 7887  # /v1/places/autocomplete?q=Taiwan -> id 7887 "Taiwan" (country; 7888 is a smaller region)
LICENCES = ("cc0", "cc-by")
MIN_PHOTOS, MAX_PHOTOS = 4, 6
TOP_N = 40
DOWNLOAD_DATE = "2026-10-20"
PHENOLOGY_ATTR = 12  # controlled term "Plant Phenology"

# Chinese name in the open data -> scientific name used to look the taxon up (checked against iNaturalist output).
SCIENTIFIC = {
    "榕樹": "Ficus microcarpa",
    "茄苳": "Bischofia javanica",
    "樟樹": "Camphora officinarum",
    "楓香": "Liquidambar formosana",
    "臺灣欒樹": "Koelreuteria elegans",
    "黑板樹": "Alstonia scholaris",
    "白千層": "Melaleuca quinquenervia",
    "小葉欖仁": "Terminalia mantaly",
    "水黃皮": "Pongamia pinnata",
    "山櫻花": "Prunus campanulata",
    "大花紫薇": "Lagerstroemia speciosa",
    "大王椰子": "Roystonea regia",
    "光蠟樹": "Fraxinus griffithii",
    "阿勃勒": "Cassia fistula",
    "苦楝": "Melia azedarach",
    "木棉": "Bombax ceiba",
    "垂榕": "Ficus benjamina",
    "福木": "Garcinia subelliptica",
    "蒲葵": "Livistona chinensis",
    "烏桕": "Triadica sebifera",
    "菩提樹": "Ficus religiosa",
    "芒果": "Mangifera indica",
    "黃椰子": "Dypsis lutescens",
    "紫薇": "Lagerstroemia indica",
    "榔榆": "Ulmus parvifolia",
    "九芎": "Lagerstroemia subcostata",
    "盾柱木": "Peltophorum pterocarpum",
    "龍柏": "Juniperus chinensis",  # 龍柏 is the cultivar 'Kaizuka'; iNaturalist has the species only
    "落羽杉": "Taxodium distichum",
    "櫻花": "Prunus × yedoensis",  # the open data says only 櫻花; 吉野櫻 is the commonest street cherry
    "櫸": "Zelkova serrata",
    "羅比親王海棗": "Phoenix roebelenii",
    "亞力山大椰子": "Archontophoenix alexandrae",
    "流蘇": "Chionanthus retusus",
    "蘭嶼羅漢松": "Podocarpus costalis",
    "印度紫檀": "Pterocarpus indicus",
    "第倫桃": "Dillenia indica",
    "鳳凰木": "Delonix regia",
    "血桐": "Macaranga tanarius",
    "黃連木": "Pistacia chinensis",
}


def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


_last = 0.0


def api_get(path: str, params: dict):
    """GET with on-disk cache, a 1 request/second pace and a few retries."""
    import requests

    global _last
    key = path + "?" + "&".join(f"{k}={params[k]}" for k in sorted(params))
    f = CACHE / (hashlib.sha1(key.encode()).hexdigest()[:16] + ".json")
    if f.exists():
        return json.loads(f.read_text())
    for attempt in range(5):
        wait = MIN_INTERVAL - (time.monotonic() - _last)
        if wait > 0:
            time.sleep(wait)
        _last = time.monotonic()
        r = requests.get(API + path, params=params, headers={"User-Agent": UA, "Accept": "application/json"}, timeout=60)
        if r.status_code == 429 or r.status_code >= 500:
            time.sleep(10 * (attempt + 1))
            continue
        r.raise_for_status()
        CACHE.mkdir(parents=True, exist_ok=True)
        f.write_text(json.dumps({"_request": key, **r.json()}, ensure_ascii=False))
        return r.json()
    raise RuntimeError(f"iNaturalist API keeps failing: {key}")


def resolve_taxon(sci: str) -> dict:
    """/v1/taxa?q=<name>&rank=species,hybrid -> the active taxon that matches the name (synonyms resolve to the accepted taxon)."""
    d = api_get("/taxa", {"q": sci, "rank": "species,hybrid", "is_active": "true", "locale": "zh-TW", "per_page": 10})
    want = sci.lower()
    best = None
    for t in d["results"]:
        if t["name"].lower() == want:
            return t
        if best is None and (t.get("matched_term") or "").lower() == want:
            best = t
    if best:
        return best
    raise RuntimeError(f"no iNaturalist taxon for {sci!r}: {[t['name'] for t in d['results']]}")


def eligible_photo(obs: dict) -> dict | None:
    """First JPEG photo of the observation whose OWN licence is cc0/cc-by (the observation licence may differ)."""
    for p in obs.get("photos", []):
        if p.get("license_code") in LICENCES and not p.get("hidden") and not p.get("flags") and re.search(r"\.jpe?g$", p.get("url") or ""):
            return p
    return None


def phenology(obs: dict):
    for a in obs.get("annotations") or []:
        if a.get("controlled_attribute_id") == PHENOLOGY_ATTR:
            return a.get("controlled_value_id")
    return None


def candidates(taxon_id: int, place_id: int | None) -> list[dict]:
    """Research-grade observations of the taxon, most voted first (2 pages x 100), with an eligible photo."""
    out: list[dict] = []
    for page in (1, 2):
        params = {
            "taxon_id": taxon_id,
            "quality_grade": "research",
            "photos": "true",
            "photo_license": ",".join(LICENCES),
            "order_by": "votes",
            "order": "desc",
            "per_page": 100,
            "page": page,
        }
        if place_id:
            params["place_id"] = place_id
        d = api_get("/observations", params)
        for o in d["results"]:
            p = eligible_photo(o)
            if p and o.get("user"):
                out.append({"obs": o, "photo": p})
        if len(d["results"]) < 100:
            break
    return out


def pick(cands: list[dict], taken_users: set, want: int) -> list[dict]:
    """Up to `want` photos, one per observer, in vote order; at most 2 per phenology stage first so the set is not all flowers."""
    chosen: list[dict] = []
    per_stage: dict = {}
    for relax in (False, True):
        for c in cands:
            if len(chosen) >= want:
                return chosen
            uid = c["obs"]["user"]["id"]
            if uid in taken_users or c in chosen:
                continue
            stage = phenology(c["obs"])
            if not relax and per_stage.get(stage, 0) >= 2:
                continue
            chosen.append(c)
            taken_users.add(uid)
            per_stage[stage] = per_stage.get(stage, 0) + 1
    return chosen


def download(photo_id: int, url: str, folder: Path) -> Path:
    import requests

    medium = re.sub(r"/(square|small|thumb|large|original)\.", "/medium.", url)
    dest = folder / f"{photo_id}.jpg"
    if dest.exists():
        return dest
    r = requests.get(medium, headers={"User-Agent": UA}, timeout=60)
    r.raise_for_status()
    if r.content[:3] != b"\xff\xd8\xff":
        raise RuntimeError(f"not a JPEG: {medium}")
    folder.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(r.content)
    time.sleep(0.3)
    return dest


def entry(zh: str, sci: str, taxon: dict, c: dict, scope: str, rel: str) -> dict:
    o, p = c["obs"], c["photo"]
    u = o["user"]
    medium = re.sub(r"/(square|small|thumb|large|original)\.", "/medium.", p["url"])
    return {
        "species": zh,
        "scientific_name": taxon["name"],
        "searched_as": sci,
        "taxon_id": taxon["id"],
        "photo_id": p["id"],
        "file": rel,
        "observation_id": o["id"],
        "observation_url": f"https://www.inaturalist.org/observations/{o['id']}",
        "observer_login": u["login"],
        "observer_name": u.get("name") or u["login"],
        "license_code": p["license_code"],
        "attribution": p["attribution"],
        "original_url": medium,
        "scope": scope,
        "phenology_value_id": phenology(o),
        "votes": o.get("cached_votes_total"),
        "downloaded": DOWNLOAD_DATE,
    }


def run() -> None:
    rows = json.loads(SPECIES_JSON.read_text())[:TOP_N]
    names = [r["species"] for r in rows]
    missing = [n for n in names if n not in SCIENTIFIC]
    if missing:
        sys.exit(f"no scientific name for: {missing}")
    photos: list[dict] = []
    species_info: dict = {}
    for zh in names:
        sci = SCIENTIFIC[zh]
        taxon = resolve_taxon(sci)
        print(f"{zh:8} {sci:28} -> {taxon['name']} (#{taxon['id']}, zh-TW: {taxon.get('preferred_common_name')})", flush=True)
        folder = OUT / slug(taxon["name"])
        taken: set = set()
        chosen = [(c, "Taiwan") for c in pick(candidates(taxon["id"], TAIWAN_PLACE_ID), taken, MAX_PHOTOS)]
        if len(chosen) < MIN_PHOTOS:
            chosen += [(c, "world") for c in pick(candidates(taxon["id"], None), taken, MIN_PHOTOS - len(chosen))]
        for c, scope in chosen:
            f = download(c["photo"]["id"], c["photo"]["url"], folder)
            photos.append(entry(zh, sci, taxon, c, scope, str(f.relative_to(OUT))))
        species_info[zh] = {
            "scientific_name": taxon["name"],
            "taxon_id": taxon["id"],
            "inat_common_name_zh_tw": taxon.get("preferred_common_name"),
            "photos": len(chosen),
            "from_world": sum(1 for _, s in chosen if s == "world"),
        }
        print(f"           {len(chosen)} photos ({species_info[zh]['from_world']} from outside Taiwan)", flush=True)
    short = [z for z, i in species_info.items() if i["photos"] < MIN_PHOTOS]
    manifest = {
        "source": "iNaturalist (https://www.inaturalist.org), official API v1",
        "downloaded": DOWNLOAD_DATE,
        "licences_allowed": [l.upper().replace("-", " ") for l in LICENCES],
        "rule": "Only photos whose own licence is CC0 or CC BY; at most one photo per observer; research grade; Taiwan (place 7887) first.",
        "summary": {
            "species": len(species_info),
            "photos": len(photos),
            "short": {z: species_info[z]["photos"] for z in short},
            "per_species": species_info,
        },
        "photos": photos,
    }
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + "\n")
    print(f"\n{len(photos)} photos for {len(species_info)} species -> {MANIFEST.relative_to(ROOT)}; fewer than {MIN_PHOTOS}: {short or 'none'}")


def check() -> int:
    m = json.loads(MANIFEST.read_text())
    errors: list[str] = []
    per: dict[str, list[dict]] = {}
    seen: set = set()
    for p in m["photos"]:
        per.setdefault(p["species"], []).append(p)
        if p["license_code"] not in LICENCES:
            errors.append(f"{p['species']} photo {p['photo_id']}: licence {p['license_code']!r} not allowed")
        if p["photo_id"] in seen:
            errors.append(f"photo {p['photo_id']} listed twice")
        seen.add(p["photo_id"])
        if not (OUT / p["file"]).exists():
            errors.append(f"missing file {p['file']}")
        if not p.get("attribution") or not p.get("observation_url") or not p.get("observer_login"):
            errors.append(f"photo {p['photo_id']}: attribution/observation_url/observer missing")
    short = m["summary"]["short"]
    for zh, ps in per.items():
        if len(ps) > MAX_PHOTOS:
            errors.append(f"{zh}: {len(ps)} photos > {MAX_PHOTOS}")
        if len(ps) < MIN_PHOTOS and zh not in short:
            errors.append(f"{zh}: {len(ps)} photos < {MIN_PHOTOS} and not listed as short")
        if len({p["observer_login"] for p in ps}) != len(ps):
            errors.append(f"{zh}: same observer twice")
    for z in SCIENTIFIC:
        if z not in per and z not in short:
            errors.append(f"{z}: no photos and not listed as short")
    for e in errors:
        print("FAIL", e)
    n = len(m["photos"])
    print(f"{'OK' if not errors else 'FAILED'}: {n} photos, {len(per)} species, all cc0/cc-by; short: {short or 'none'}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(check() if "--check" in sys.argv else (run() or 0))
