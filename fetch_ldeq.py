"""Download LDEQ water quality data from https://waterdata.deq.louisiana.gov.

The site's tables and Excel exports are built client-side from public JSON
endpoints; this script calls those endpoints directly.

Usage:
    python3 fetch_ldeq.py meta                 # projects, sites, reference tables -> data/meta/
    python3 fetch_ldeq.py results [SITE ...]   # per-site lab + field data -> data/sites/<id>/
    python3 fetch_ldeq.py csv                  # combine cached sites -> data/lab_results.csv, data/field_results.csv

`results` with no site IDs fetches every site in data/meta/sites.json. Sites already
cached are skipped, so an interrupted run can be resumed.
"""
import csv
import json
import pathlib
import sys
import time
import urllib.request

BASE = "https://waterdata.deq.louisiana.gov/api"
DATA = pathlib.Path(__file__).parent / "data"
META = DATA / "meta"
SITES = DATA / "sites"
DELAY = 0.5  # seconds between requests, to go easy on the server

META_ENDPOINTS = {
    "projects": "ProjectsPublicData/GetAllProjects",
    "sites": "SitesData/GetSiteMap_FromView",
    "analytical_fractions": "SitesData/GetAnalyticalFractions",
    "ref_analyte_types": "ProjectsPublicData/GetAnalyteTypeReferences",
    "ref_analytical_fractions": "ProjectsPublicData/GetAnalyticalFractionReferences",
    "ref_interpreted_qualifiers": "ProjectsPublicData/GetInterpretedQualifierReferences",
    "ref_lab_qualifiers": "ProjectsPublicData/GetLabQualifierReferences",
    "ref_lab_sample_types": "ProjectsPublicData/GetLabSampleTypeReferences",
    "ref_matrices": "ProjectsPublicData/GetMatrixReferences",
    "ref_methods": "ProjectsPublicData/GetMethodReferences",
    "ref_subsegments": "ProjectsPublicData/GetSubsegmentReferences",
    "ref_validation_qualifiers": "ProjectsPublicData/GetValidationQualifierReferences",
    "ref_wq_parameters": "ProjectsPublicData/GetWQParameterReferences",
}

SITE_ENDPOINTS = {
    "lab": "ProjectsPublicData/GetLabCollectionData/{}",
    "field": "ProjectsPublicData/GetCollectionsFromView/{}",
}


def get(path, retries=3):
    req = urllib.request.Request(f"{BASE}/{path}", headers={"Accept": "application/json", "User-Agent": "Mozilla/5.0"})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                return resp.read()
        except OSError as e:
            if attempt == retries - 1:
                raise
            print(f"  retry {path}: {e}", file=sys.stderr)
            time.sleep(5 * (attempt + 1))


def fetch_meta():
    META.mkdir(parents=True, exist_ok=True)
    for name, path in META_ENDPOINTS.items():
        body = get(path)
        (META / f"{name}.json").write_bytes(body)
        print(f"{name}: {len(json.loads(body))} rows")
        time.sleep(DELAY)


def fetch_results(site_ids):
    if not site_ids:
        site_ids = [s["id"] for s in json.loads((META / "sites.json").read_text())]
    for i, site in enumerate(site_ids, 1):
        out = SITES / site
        out.mkdir(parents=True, exist_ok=True)
        for name, path in SITE_ENDPOINTS.items():
            dest = out / f"{name}.json"
            if dest.exists():
                continue
            body = get(path.format(site))
            tmp = dest.with_suffix(".tmp")
            tmp.write_bytes(body)
            tmp.rename(dest)
            time.sleep(DELAY)
        print(f"[{i}/{len(site_ids)}] {site}")


def write_csv(kind, dest):
    # Field rows have varying columns across sites, so collect the union first.
    files = sorted(SITES.glob(f"*/{kind}.json"))
    fields = {}
    for f in files:
        for row in json.loads(f.read_text()):
            fields.update(dict.fromkeys(row))
    count = 0
    with open(dest, "w", newline="") as out:
        writer = csv.DictWriter(out, fieldnames=list(fields))
        writer.writeheader()
        for f in files:
            rows = json.loads(f.read_text())
            writer.writerows(rows)
            count += len(rows)
    print(f"{dest.name}: {count} rows from {len(files)} sites")


def main():
    cmd, args = (sys.argv[1], sys.argv[2:]) if len(sys.argv) > 1 else ("", [])
    if cmd == "meta":
        fetch_meta()
    elif cmd == "results":
        fetch_results(args)
    elif cmd == "csv":
        write_csv("lab", DATA / "lab_results.csv")
        write_csv("field", DATA / "field_results.csv")
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
