# SafeCatchLA

A mobile-first map of mercury levels in fish at Louisiana sampling sites. Tap a site to see each species' average, how it has changed over time, and how it compares to its basin, the state, and U.S. lakes.

**This is not health advice.** Averages may be above advisory levels. Check the Louisiana Department of Health's current [fish consumption advisories](https://ldh.la.gov/page/2629) before eating fish.

## Data

- **Louisiana DEQ Mercury Initiative (project WQ1994001)**, from the public endpoint behind https://waterdata.deq.louisiana.gov/MercuryData. This is fish-tissue mercury only.
- **DEQ site list**, used for site address text and town search.
- **EPA 2022 National Lakes Assessment** fish-tissue mercury, as simple averages per species. This is a static file, already summarized into `web/public/data/national.json`.

Averaging follows Louisiana's fish advisory protocol: arithmetic means per species, and non-detects counted as 0, or as half the reporting limit when most samples are detects. Rejected results are excluded. The reference line is EPA's 0.3 ppm methylmercury criterion. The design is in `docs/superpowers/specs/2026-10-24-mercury-map-design.md`.

Visitors' browsers never contact DEQ. A GitHub Actions job (`.github/workflows/deploy.yml`) refreshes the data weekly, commits it only when it changed, and deploys to GitHub Pages.

## Run locally

Requirements: [uv](https://docs.astral.sh/uv/) and Node 22+.

```bash
# Data pipeline
uv sync
uv run pytest pipeline/tests
uv run python -m pipeline.fetch   # downloads to data/raw/ (about 37 MB)
uv run python -m pipeline.build   # writes web/public/data/

# Web app
cd web
npm install
npm test                 # unit tests
npx playwright install chromium && npm run e2e   # phone-sized smoke tests
npm run dev              # http://localhost:5173/SafeCatchLA/
```

To serve from a custom domain instead of `/SafeCatchLA/`, build with `BASE_PATH=/ npm run build` and add a `CNAME` file to `web/public/`.

`fetch_ldeq.py` is an exploration tool that can download other LDEQ water-quality datasets. The app doesn't use it.
