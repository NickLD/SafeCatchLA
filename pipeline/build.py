"""Build the static JSON the web app loads from raw DEQ downloads.

Usage: uv run python -m pipeline.build
Reads data/raw/mercury.json and data/raw/sites.json, writes web/public/data/.
"""
import hashlib
import json
import shutil
import tempfile
from collections import defaultdict
from datetime import date
from pathlib import Path

from pipeline.rules import basin_code, parse_samples, substitute_nondetects

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "web" / "public" / "data"
GUIDELINE_PPM = 0.3
MIN_LENGTHS_FOR_SIZE_CLASSES = 9


def _r(v):
    return round(v, 4) if v is not None else None


def _dump(obj):
    return json.dumps(obj, sort_keys=True, separators=(",", ":"))


def _write(path, text):
    tmp = path.with_suffix(".tmp")
    tmp.write_text(text)
    tmp.replace(path)


def _site_info(mercury_rows):
    info = {}
    for r in mercury_rows:
        if r.get("PARAMETER") == "MERCURY" and r.get("MATRIX") == "TE" and r["SITE"] not in info:
            info[r["SITE"]] = r
    return info


def size_class_cutoffs(samples):
    """Per-species length cutoffs (cm) splitting Louisiana samples into thirds: small / medium / large."""
    lengths = defaultdict(list)
    for s in samples:
        if s.length_cm:
            lengths[s.species].append(s.length_cm)
    cutoffs = {}
    for species, ls in sorted(lengths.items()):
        if len(ls) < MIN_LENGTHS_FOR_SIZE_CLASSES:
            continue
        ls.sort()
        n = len(ls) - 1
        cutoffs[species] = [ls[round(n / 3)], ls[round(2 * n / 3)]]
    return cutoffs


def build(mercury_rows, site_rows, out_dir, today):
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    samples, skipped = parse_samples(mercury_rows)
    info = _site_info(mercury_rows)
    addresses = {s.get("id"): s.get("address") or "" for s in site_rows}

    groups = defaultdict(list)
    for s in samples:
        groups[(s.site, s.species)].append(s)

    sites, details = {}, {}
    for (site_id, species), group in sorted(groups.items()):
        group.sort(key=lambda s: s.date)
        values = substitute_nondetects(group)
        years = defaultdict(lambda: [0.0, 0])
        for s, v in zip(group, values):
            y = years[str(s.date.year)]
            y[0] += v
            y[1] += 1
        last_date = group[-1].date
        latest = [v for s, v in zip(group, values) if s.date == last_date]
        r = info[site_id]
        site = sites.setdefault(site_id, {
            "id": site_id,
            "name": r.get("SITE_NAME") or site_id,
            "lat": r.get("LAT_WGS84"),
            "lon": r.get("LON_WGS84"),
            "basin": basin_code(r.get("SUBSEGMENT_NUMBER")),
            "address": addresses.get(site_id, ""),
            "n": 0,
            "last": "",
            "species": {},
        })
        site["n"] += len(group)
        site["last"] = max(site["last"], last_date.isoformat())
        site["species"][species] = {
            "n": len(group),
            "latest": [last_date.isoformat(), _r(sum(latest) / len(latest)), len(latest)],
            "years": {y: [_r(t), c] for y, (t, c) in years.items()},
        }
        details.setdefault(site_id, {"id": site_id, "species": {}})["species"][species] = [
            {"date": s.date.isoformat(), "value": _r(v), "nd": s.is_nd, "weightG": s.weight_g,
             "lengthCm": s.length_cm, "nFish": s.n_fish, "composite": s.composite}
            for s, v in zip(group, values)
        ]

    sites_text = _dump({
        "latestYear": max(s.date.year for s in samples) if samples else None,
        "sites": [sites[k] for k in sorted(sites)],
        "sizeClasses": size_class_cutoffs(samples),
    })
    detail_texts = {k: _dump(details[k]) for k in sorted(details)}
    digest = hashlib.sha256(sites_text.encode())
    for k, text in detail_texts.items():
        digest.update(k.encode() + text.encode())
    data_hash = digest.hexdigest()

    meta_path = out_dir / "meta.json"
    previous = json.loads(meta_path.read_text()) if meta_path.exists() else {}
    meta = {
        "updated": previous["updated"] if previous.get("dataHash") == data_hash else today.isoformat(),
        "dataHash": data_hash,
        "rawTissueRows": sum(1 for r in mercury_rows if r.get("PARAMETER") == "MERCURY" and r.get("MATRIX") == "TE"),
        "samples": len(samples),
        "sites": len(sites),
        "guidelinePpm": GUIDELINE_PPM,
        "skipped": dict(sorted(skipped.items())),
    }

    # Swap in the per-site directory whole, so a crash never leaves a half-written set.
    staging = Path(tempfile.mkdtemp(dir=out_dir, prefix=".sites-"))
    for k, text in detail_texts.items():
        (staging / f"{k}.json").write_text(text)
    target = out_dir / "sites"
    if target.exists():
        old = out_dir / ".sites-old"
        shutil.rmtree(old, ignore_errors=True)
        target.rename(old)
        staging.rename(target)
        shutil.rmtree(old)
    else:
        staging.rename(target)
    _write(out_dir / "sites.json", sites_text)
    _write(meta_path, _dump(meta))
    return meta


def main():
    mercury = json.loads((RAW / "mercury.json").read_text())
    site_rows = json.loads((RAW / "sites.json").read_text())
    meta = build(mercury, site_rows, OUT, date.today())
    print(json.dumps(meta, indent=1))


if __name__ == "__main__":
    main()
