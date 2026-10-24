"""Download LDEQ Mercury Initiative data (project WQ1994001).

The Excel export on https://waterdata.deq.louisiana.gov/MercuryData is generated
client-side by DataTables; the page loads every row from a single unauthenticated
JSON endpoint, which this script calls directly.

Writes data/mercury_raw.json and data/mercury.csv.
"""
import csv
import json
import pathlib
import urllib.request

URL = "https://waterdata.deq.louisiana.gov/api/ProjectsPublicData/GetMercuryDataFromView"
OUT = pathlib.Path(__file__).parent / "data"


def fetch():
    req = urllib.request.Request(URL, headers={"Accept": "application/json", "User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.load(resp)


def main():
    rows = fetch()
    OUT.mkdir(exist_ok=True)
    (OUT / "mercury_raw.json").write_text(json.dumps(rows))
    with open(OUT / "mercury.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    print(f"{len(rows)} rows, {len({r['SITE'] for r in rows})} sites -> {OUT}")


if __name__ == "__main__":
    main()
