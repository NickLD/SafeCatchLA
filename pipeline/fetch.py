"""Download and validate the raw DEQ data the build needs.

Usage: uv run python -m pipeline.fetch
Writes data/raw/mercury.json and data/raw/sites.json only if both downloads pass validation.
"""
import json
import sys
import time
import urllib.request

from pipeline.build import OUT, RAW

MERCURY_URL = "https://waterdata.deq.louisiana.gov/api/ProjectsPublicData/GetMercuryDataFromView"
SITES_URL = "https://waterdata.deq.louisiana.gov/api/SitesData/GetSiteMap_FromView"
USER_AGENT = "SafeCatchLA data refresh (+https://github.com/NickLD/SafeCatchLA)"
REQUIRED_FIELDS = {"SITE", "SITE_NAME", "PARAMETER", "MATRIX", "RESULT", "UNITS", "TAXA_COMMON_NAME",
                   "COLLECTION_DATE", "LAT_WGS84", "LON_WGS84"}
MIN_FRACTION_OF_PREVIOUS = 0.9


class FetchError(Exception):
    pass


def fetch_json(url, attempts=3):
    req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": USER_AGENT})
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                return json.load(resp)
        except (OSError, ValueError) as e:
            if attempt == attempts - 1:
                raise FetchError(f"{url}: {e}") from e
            time.sleep(10 * (attempt + 1))


def validate_mercury(rows, previous_raw_tissue_rows):
    if not isinstance(rows, list) or not rows:
        raise FetchError("mercury response is empty or not a list")
    missing = REQUIRED_FIELDS - set(rows[0])
    if missing:
        raise FetchError(f"mercury rows missing fields: {', '.join(sorted(missing))}")
    tissue = sum(1 for r in rows if r.get("PARAMETER") == "MERCURY" and r.get("MATRIX") == "TE")
    if previous_raw_tissue_rows and tissue < previous_raw_tissue_rows * MIN_FRACTION_OF_PREVIOUS:
        raise FetchError(f"tissue rows dropped to {tissue} from {previous_raw_tissue_rows}")


def validate_sites(rows):
    if not isinstance(rows, list) or not rows:
        raise FetchError("sites response is empty or not a list")
    if not {"id", "address"} <= set(rows[0]):
        raise FetchError("sites rows missing id/address")


def main():
    meta_path = OUT / "meta.json"
    previous = json.loads(meta_path.read_text()).get("rawTissueRows") if meta_path.exists() else None
    try:
        mercury = fetch_json(MERCURY_URL)
        validate_mercury(mercury, previous)
        sites = fetch_json(SITES_URL)
        validate_sites(sites)
    except FetchError as e:
        sys.exit(f"fetch failed: {e}")
    RAW.mkdir(parents=True, exist_ok=True)
    (RAW / "mercury.json").write_text(json.dumps(mercury))
    (RAW / "sites.json").write_text(json.dumps(sites))
    print(f"fetched {len(mercury)} mercury rows, {len(sites)} sites")


if __name__ == "__main__":
    main()
