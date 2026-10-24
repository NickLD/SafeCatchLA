# SafeCatchLA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first map of Louisiana fish-tissue mercury sampling sites. Tapping a site opens a drawer showing per-species averages, trends and comparisons. It is hosted on GitHub Pages and refreshed weekly by CI.

**Architecture:**
- A Python pipeline (`pipeline/`) fetches LDEQ's mercury endpoint and the DEQ sites list, applies Louisiana protocol averaging rules, and writes small static JSON into `web/public/data/`.
- A Svelte 5 + Vite single-page app (`web/`) renders a Leaflet map and charts from that JSON. It never calls DEQ.
- One GitHub Actions workflow refreshes the data weekly, commits it only when it changed, and builds and deploys Pages in the same run.

**Tech Stack:**
- Python 3.12 with uv, pytest, and openpyxl (national data only)
- Node 22+, Svelte 5 (runes), Vite, Leaflet, vite-plugin-pwa
- Vitest with @testing-library/svelte; Playwright for one mobile smoke test
- GitHub Actions and GitHub Pages

**Spec:** `docs/superpowers/specs/2026-10-24-mercury-map-design.md`

## Global Constraints

**Data rules (from the spec):**
- Fish-tissue mercury only: `PARAMETER == "MERCURY"` and `MATRIX == "TE"`.
- Units `ppm`, `ug/g`, `mg/kg` are equivalent and displayed as ppm. Any other unit is excluded and counted in `skipped`.
- Exclude rows where `VALIDATION_QUALIFIER == "R"`.
- **Non-detects:**
  - A non-detect is null `RESULT` with `U` in `LAB_FIELD_QUALIFIER` or `INTERPRETED_QUALIFIER`, or a numeric `RESULT` with a `U` qualifier (that `RESULT` is then its reporting limit).
  - Substitution is applied per site + species: 0, unless more than half of that group's samples are detects, in which case ½ the reporting limit.
  - Reporting limit = PQL if > 0, else MDL if > 0, else none (counts as 0).
- Averages are arithmetic means of samples, per species. A mixed-species value is always labelled "All species (mixed)".
- **Basin and statewide comparisons:** mean of site means (each site counts once), shown as "n sites".

**Display rules:**
- Basin code = characters 3–4 of `SUBSEGMENT_NUMBER` (`LA050401_00` → `05`). Valid codes are `01`–`12`; anything else means no basin.
- Reference line: `EPA_GUIDELINE_PPM = 0.3`, labelled exactly "EPA guideline (0.3 ppm)", never "Louisiana advisory".
- No meal-limit or "safe to eat" output anywhere.
- National comparison is labelled exactly "U.S. lakes (EPA 2022)". Species with fewer than 5 national samples show "no national data".
- **Average period:**
  - Default is the last 10 years, counted by calendar year back from the newest sample year in the dataset (`year >= latestYear - 9`).
  - Choices: 5, 10, 20 years, or `all`. The setting applies app-wide and is stored in the URL hash.
  - The trend chart always shows full history.
- Sites with no samples in the selected period render grey as "no recent data". They are never hidden.

**Required copy:**
- Disclaimer, shown whenever site data is shown: "Mercury averages here may be above advisory levels. This is not health advice. Check the Louisiana Department of Health's current fish consumption advisories before eating fish from this area." It links to `https://ldh.la.gov/page/2629`.
- Every displayed average shows its count ("157 samples" or "42 sites").

**Hosting and data source:**
- Visitors' browsers never request any `deq.louisiana.gov` URL.
- Repo `NickLD/SafeCatchLA`. Vite `base` comes from env `BASE_PATH`, defaulting to `/SafeCatchLA/`.
- DEQ endpoints:
  - `https://waterdata.deq.louisiana.gov/api/ProjectsPublicData/GetMercuryDataFromView`
  - `https://waterdata.deq.louisiana.gov/api/SitesData/GetSiteMap_FromView`
- EPA file: `https://www.epa.gov/system/files/documents/2024-08/final-nla-2022-mercury-public-release-file-7-24-24.xlsx`

## Review Focus

1. **A site/species with a single sample, or only non-detects:** shows the value (0.00 for all non-detects) with "1 sample". No NaN, no crash. Tests are in Task 1 (`test_all_nondetects_become_zero`) and Task 5 (`periodMean single sample`).
2. **A site with nothing in the selected period:** it is grey on the map, its drawer still shows full history and the trend, and it is excluded from the basin/state means. Tests are in Task 5 (`groupMean skips sites without period data`) and Task 6 (`colorSite no recent data`).
3. **A species absent from the EPA national file, or with n < 5:** the national row reads "no national data", not a zero-length bar. Test is in Task 8 (`CompareBars shows no national data`).
4. **DEQ returns an empty, truncated or reshaped response:** the refresh fails loudly and the committed data is unchanged. Tests are in Task 3 (`validate_mercury` tests).
5. **A malformed or stale shared link** (unknown site id, bad period, URL-encoded species with spaces): the app loads the map normally and ignores the bad parts. Tests are in Task 6 (`parseHash` tests) and Task 9 (e2e `bad deep link`).

---

## File Structure

```
pyproject.toml                    uv project: pipeline deps + pytest
.gitignore                        data/, node_modules/, web/dist/, .superpowers/, caches
pipeline/__init__.py
pipeline/rules.py                 row parsing, non-detect substitution, basin codes
pipeline/build.py                 raw JSON -> web/public/data/{sites,meta}.json + sites/<id>.json
pipeline/fetch.py                 download + validate DEQ responses -> data/raw/
pipeline/national.py              EPA xlsx -> web/public/data/national.json (run once, committed)
pipeline/tests/test_rules.py
pipeline/tests/test_build.py
pipeline/tests/test_fetch.py
pipeline/tests/test_national.py
web/package.json, vite.config.js, index.html
web/public/data/                  generated, committed
web/src/main.js, App.svelte
web/src/lib/config.js             constants (guideline, bands, periods, basins, URLs)
web/src/lib/format.js             displaySpecies, formatPpm
web/src/lib/stats.js              periodMean, trendClass, changeSinceEarliest, groupMean, mixedYears
web/src/lib/coloring.js           mercuryBand, colorSite, legendFor
web/src/lib/urlState.js           parseHash, toHash
web/src/lib/search.js             searchSites
web/src/lib/data.js               loaders for the JSON files
web/src/lib/state.svelte.js       app state (runes), synced to location.hash
web/src/components/MapView.svelte, TopBar.svelte, Legend.svelte
web/src/components/SiteSheet.svelte, SpeciesChips.svelte, HeadlineStats.svelte,
                   Disclaimer.svelte, TrendChart.svelte, CompareBars.svelte, AllSpeciesList.svelte
web/tests/*.test.js               vitest
web/e2e/smoke.spec.js             playwright, mobile viewport
.github/workflows/deploy.yml
```

`fetch_mercury.py` is deleted in Task 3, because `pipeline/fetch.py` replaces it. `fetch_ldeq.py` stays as an exploration tool.

---

### Task 1: Repo bootstrap and pipeline rules

**Files:**
- Create: `pyproject.toml`, `.gitignore` (overwrite the existing one-line file), `pipeline/__init__.py`, `pipeline/rules.py`, `pipeline/tests/test_rules.py`

**Interfaces:**
- Produces, in `pipeline/rules.py`:
  - `@dataclass(frozen=True) class Sample`. Fields:
    - `site: str`, `species: str`, `date: datetime.date`
    - `value: float | None` (None for non-detects before substitution)
    - `is_nd: bool`, `rl: float | None`
    - `weight_g: float | None`, `length_cm: float | None`, `n_fish: int | None`, `composite: bool`
  - `parse_samples(rows: list[dict]) -> tuple[list[Sample], collections.Counter]`. The Counter keys skip reasons: `"not_tissue_mercury"`, `"rejected"`, `"unit"`, `"null_no_qualifier"`, `"no_species"`.
  - `substitute_nondetects(samples: list[Sample]) -> list[float]`. It takes one site+species group and returns values in input order.
  - `basin_code(subsegment: str | None) -> str | None`

- [ ] **Step 1: Bootstrap**

```bash
cd /var/home/nick/Documents/GitHub/ChrisMerchMap && git init -b main
uv init --bare --python 3.12 && uv add --dev pytest && uv add openpyxl
```

`.gitignore` contains: `.superpowers/`, `data/`, `node_modules/`, `web/dist/`, `__pycache__/`, `.venv/`, `.pytest_cache/`, `web/test-results/`, `web/playwright-report/`.

- [ ] **Step 2: Write failing tests** in `pipeline/tests/test_rules.py`. Use a `row(**kw)` helper with these defaults:
  - `PARAMETER="MERCURY"`, `MATRIX="TE"`, `RESULT=0.5`, `UNITS="ppm"`
  - `SITE="0001"`, `TAXA_COMMON_NAME="LARGEMOUTH BASS"`, `COLLECTION_DATE="2010-05-01T00:00:00"`
  - all qualifiers, `MDL` and `PQL` set to `None`, `SUBSEGMENT_NUMBER="LA050401_00"`
  - `AVERAGE_FISH_WEIGHT=400.0`, `AVERAGE_FISH_LENGTH=30.0`, `NUMBEROFFISH="Composite"`, `NUMBER_OF_FISH=5.0`

```python
def test_keeps_only_tissue_mercury():
    s, skipped = parse_samples([row(), row(PARAMETER="PH"), row(MATRIX="W")])
    assert len(s) == 1 and skipped["not_tissue_mercury"] == 2

def test_excludes_rejected():
    s, skipped = parse_samples([row(VALIDATION_QUALIFIER="R")])
    assert s == [] and skipped["rejected"] == 1

def test_equivalent_units_and_unknown_unit():
    s, skipped = parse_samples([row(UNITS="ug/g", RESULT=0.4), row(UNITS="mg/kg"), row(UNITS="ug/kg")])
    assert [x.value for x in s] == [0.4, 0.5] and skipped["unit"] == 1

def test_null_result_with_U_is_nondetect_with_fallback_rl():
    [s], _ = parse_samples([row(RESULT=None, LAB_FIELD_QUALIFIER="U", PRACTICAL_QUANTITATION_LIMIT=0.0, MDL=0.001)])
    assert s.is_nd and s.value is None and s.rl == 0.001

def test_numeric_result_with_U_uses_result_as_rl():
    [s], _ = parse_samples([row(RESULT=0.002, INTERPRETED_QUALIFIER="U")])
    assert s.is_nd and s.rl == 0.002

def test_null_without_qualifier_dropped():
    s, skipped = parse_samples([row(RESULT=None)])
    assert s == [] and skipped["null_no_qualifier"] == 1

def test_parses_fish_fields():
    [s], _ = parse_samples([row()])
    assert (s.date.isoformat(), s.weight_g, s.length_cm, s.n_fish, s.composite) == ("2010-05-01", 400.0, 30.0, 5, True)

def test_substitution_more_than_half_detects_uses_half_rl():
    nd = Sample("0001", "X", date(2010,1,1), None, True, 0.002, None, None, None, False)
    det = lambda v: Sample("0001", "X", date(2010,1,1), v, False, None, None, None, None, False)
    assert substitute_nondetects([det(0.4), det(0.6), nd]) == [0.4, 0.6, 0.001]
    assert substitute_nondetects([det(0.4), nd]) == [0.4, 0.0]          # exactly half -> zero
    assert substitute_nondetects([det(0.4), nd, nd]) == [0.4, 0.0, 0.0]

def test_all_nondetects_become_zero():
    nd = Sample("0001", "X", date(2010,1,1), None, True, None, None, None, None, False)
    assert substitute_nondetects([nd]) == [0.0]

def test_basin_code():
    assert basin_code("LA050401_00") == "05"
    assert basin_code("LA120101_00") == "12"
    assert basin_code("LA000000_00") is None
    assert basin_code(None) is None
```

- [ ] **Step 3: Run** `uv run pytest pipeline/tests/test_rules.py -v`. Expected: FAIL (ImportError).
- [ ] **Step 4: Implement** `pipeline/rules.py` per the Interfaces. Skip reasons are checked in this order: `not_tissue_mercury`, `rejected`, `no_species`, `unit`, `null_no_qualifier`. `composite` is `NUMBEROFFISH == "Composite"`.
- [ ] **Step 5: Run** `uv run pytest pipeline/tests -v`. Expected: all PASS.
- [ ] **Step 6: Commit** `git add -A && git commit -m "feat(pipeline): tissue mercury parsing and protocol non-detect rules"`. This first commit also includes the spec, the plan, and `fetch_*.py`.

---

### Task 2: Build static data files

**Files:**
- Create: `pipeline/build.py`, `pipeline/tests/test_build.py`

**Interfaces:**
- Consumes: `parse_samples`, `substitute_nondetects`, `basin_code` (Task 1).
- Produces: `build(mercury_rows: list[dict], site_rows: list[dict], out_dir: Path, today: datetime.date) -> dict`, which returns the meta dict. Also a CLI: `uv run python -m pipeline.build` reads `data/raw/mercury.json` and `data/raw/sites.json` and writes to `web/public/data/`.
- **Output contract** (consumed by Tasks 5–9). All JSON is written with `sort_keys=True` and `separators=(",", ":")`, and floats are rounded to 4 decimals.

`sites.json`:
```json
{"latestYear": 2026,
 "sites": [{"id": "0436", "name": "Lake Henderson East of Henderson, Louisiana",
   "lat": 30.31, "lon": -91.79, "basin": "01", "address": "…", "n": 360, "last": "2016-09-14",
   "species": {"LARGEMOUTH BASS": {"n": 157, "latest": ["2016-09-14", 0.31],
                                   "years": {"1994": [1.42, 2], "2016": [0.31, 1]}}}}]}
```
- `years` maps each year to `[sum of substituted values, count]`.
- `latest` is the most recent sample, as date plus substituted value. For ties on the newest date it is the mean of that date's samples.
- `name`, `lat` and `lon` come from the first mercury row for the site. `address` is from `site_rows` matched by `id`, or `""`.
- Sites are sorted by id.

`sites/<id>.json`:
```json
{"id": "0436", "species": {"LARGEMOUTH BASS": [
  {"date": "1994-08-12", "value": 0.27, "nd": false, "weightG": 419.6, "lengthCm": 31.1, "nFish": 5, "composite": true}]}}
```
Samples are sorted by date.

`meta.json`:
```json
{"updated": "2026-10-24", "dataHash": "<sha256 of sites.json bytes>", "rawTissueRows": 19780,
 "samples": 19584, "sites": 300, "guidelinePpm": 0.3, "skipped": {"rejected": 26}}
```
`updated` changes only when `dataHash` differs from the existing `meta.json` in `out_dir`.

- [ ] **Step 1: Write failing tests** with a fixture of 3 rows at site `0001` (2010 bass 0.4, 2010 bass 0.6, 2016 bass non-detect with PQL 0.002), 1 row at site `0002` (bowfin 1.0, 2020), and 1 pH row. `site_rows = [{"id": "0001", "address": "2.1 miles south of Abbeville"}]`.

```python
def test_sites_json(tmp_path):
    build(ROWS, SITE_ROWS, tmp_path, date(2026,10,24))
    d = json.loads((tmp_path/"sites.json").read_text())
    assert d["latestYear"] == 2020
    s1 = d["sites"][0]
    assert (s1["id"], s1["basin"], s1["address"], s1["n"], s1["last"]) == ("0001", "05", "2.1 miles south of Abbeville", 3, "2016-05-01")
    bass = s1["species"]["LARGEMOUTH BASS"]
    assert bass["years"] == {"2010": [1.0, 2], "2016": [0.001, 1]}   # 2 of 3 detects -> half RL
    assert bass["latest"] == ["2016-05-01", 0.001]
    assert d["sites"][1]["address"] == ""

def test_site_detail_file(tmp_path):
    build(ROWS, SITE_ROWS, tmp_path, date(2026,10,24))
    d = json.loads((tmp_path/"sites"/"0001.json").read_text())
    assert [x["value"] for x in d["species"]["LARGEMOUTH BASS"]] == [0.4, 0.6, 0.001]
    assert d["species"]["LARGEMOUTH BASS"][2]["nd"] is True

def test_deterministic_and_updated_only_on_change(tmp_path):
    m1 = build(ROWS, SITE_ROWS, tmp_path, date(2026,10,24))
    before = (tmp_path/"sites.json").read_bytes()
    m2 = build(ROWS, SITE_ROWS, tmp_path, date(2026,11,1))
    assert (tmp_path/"sites.json").read_bytes() == before
    assert m2["updated"] == m1["updated"] == "2026-10-24"
    m3 = build(ROWS + [EXTRA_ROW], SITE_ROWS, tmp_path, date(2026,11,1))
    assert m3["updated"] == "2026-11-01"

def test_meta_counts(tmp_path):
    m = build(ROWS, SITE_ROWS, tmp_path, date(2026,10,24))
    assert (m["rawTissueRows"], m["samples"], m["sites"], m["guidelinePpm"]) == (4, 4, 2, 0.3)

def test_removes_stale_site_files(tmp_path):
    (tmp_path/"sites").mkdir(); (tmp_path/"sites"/"9999.json").write_text("{}")
    build(ROWS, SITE_ROWS, tmp_path, date(2026,10,24))
    assert not (tmp_path/"sites"/"9999.json").exists()
```

- [ ] **Step 2: Run** `uv run pytest pipeline/tests/test_build.py -v`. Expected: FAIL.
- [ ] **Step 3: Implement** `pipeline/build.py`. Group samples by (site, species), call `substitute_nondetects` per group, then aggregate. Write files to a temp dir and swap them in so a crash never leaves half-written output.
- [ ] **Step 4: Run** `uv run pytest pipeline/tests -v`. Expected: PASS.
- [ ] **Step 5: Run against real data:**

```bash
mkdir -p data/raw && cp data/mercury_raw.json data/raw/mercury.json && cp data/meta/sites.json data/raw/sites.json
uv run python -m pipeline.build && ls -la web/public/data && du -sh web/public/data/sites.json
```

Expected:
- `sites.json` is under 1 MB. If it's over, report the size and stop rather than restructuring.
- About 300 site files.
- `meta.json` `skipped.rejected` is 26.

- [ ] **Step 6: Commit** `git add pipeline web/public/data && git commit -m "feat(pipeline): build static site data"`

---

### Task 3: Fetch with validation

**Files:**
- Create: `pipeline/fetch.py`, `pipeline/tests/test_fetch.py`
- Delete: `fetch_mercury.py`

**Interfaces:**
- Produces:
  - `class FetchError(Exception)`
  - `REQUIRED_FIELDS = {"SITE","SITE_NAME","PARAMETER","MATRIX","RESULT","UNITS","TAXA_COMMON_NAME","COLLECTION_DATE","LAT_WGS84","LON_WGS84"}`
  - `validate_mercury(rows, previous_raw_tissue_rows: int | None) -> None`
  - `validate_sites(rows) -> None`
  - `fetch_json(url: str) -> object`, using urllib with a 300 s timeout, 3 attempts and backoff
  - CLI `uv run python -m pipeline.fetch`. It fetches both endpoints, validates them, and only then writes `data/raw/mercury.json` and `data/raw/sites.json`. `previous_raw_tissue_rows` is read from `web/public/data/meta.json` if that exists. The CLI exits non-zero with the `FetchError` message on failure.

- [ ] **Step 1: Write failing tests**

```python
def test_rejects_non_list_and_empty():
    for bad in ({}, [], None):
        with pytest.raises(FetchError): validate_mercury(bad, None)

def test_rejects_missing_fields():
    with pytest.raises(FetchError, match="LAT_WGS84"):
        validate_mercury([{k: 1 for k in REQUIRED_FIELDS - {"LAT_WGS84"}}], None)

def test_rejects_sharp_drop():
    rows = [tissue_row()] * 89
    with pytest.raises(FetchError, match="89"): validate_mercury(rows, 100)
    validate_mercury([tissue_row()] * 90, 100)   # 90% is OK

def test_validate_sites():
    with pytest.raises(FetchError): validate_sites([{"name": "x"}])
    validate_sites([{"id": "0001", "address": "a"}])
```

- [ ] **Step 2: Run** `uv run pytest pipeline/tests/test_fetch.py -v`. Expected: FAIL.
- [ ] **Step 3: Implement** `pipeline/fetch.py`. Send the header `User-Agent: SafeCatchLA data refresh (+https://github.com/NickLD/SafeCatchLA)`.
- [ ] **Step 4: Run** `uv run pytest pipeline/tests -v`, then `uv run python -m pipeline.fetch && uv run python -m pipeline.build`. Expected: tests PASS. Fetch writes both raw files. Build reports `updated` unchanged unless DEQ data changed since Task 2.
- [ ] **Step 5: Commit** `git rm fetch_mercury.py && git add -A pipeline && git commit -m "feat(pipeline): validated DEQ fetch"`

---

### Task 4: National comparison data

**Files:**
- Create: `pipeline/national.py`, `pipeline/tests/test_national.py`, `web/public/data/national.json`

**Interfaces:**
- Produces: `summarize(hg_rows: list[tuple], info_rows: list[tuple]) -> dict`, plus a CLI `uv run python -m pipeline.national <xlsx>`.
- Output `national.json`: `{"source": "EPA 2022 National Lakes Assessment", "all": {"mean": 0.284, "n": 413}, "species": {"LARGEMOUTH BASS": {"mean": 0.334, "n": 273}, ...}}`
  - Keys are species common names upper-cased, to match DEQ's `TAXA_COMMON_NAME`.
  - Mean is in ppm: `Amount` (ng/g) / 1000.
  - Species are joined by `EPA Sample ID` → the most common `Species - Common Name` in Sample Info.
  - Species with n < 5 are omitted.

- [ ] **Step 1: Write failing test.** Build tiny tuple fixtures matching the sheet column orders:
  - Mercury sheet: col 4 = EPA Sample ID, col 9 = Amount.
  - Info sheet: col 7 = EPA Sample ID, col 12 = common name.

  Use 5 bass samples at 300 ng/g and 1 bluegill at 100. Assert `summarize(...)["species"] == {"LARGEMOUTH BASS": {"mean": 0.3, "n": 5}}` and `["all"] == {"mean": 0.2667, "n": 6}`.
- [ ] **Step 2: Run** `uv run pytest pipeline/tests/test_national.py -v`. Expected: FAIL.
- [ ] **Step 3: Implement** `pipeline/national.py`. The CLI loads the workbook with openpyxl (`read_only=True`), skips header rows, and writes `web/public/data/national.json`.
- [ ] **Step 4: Run:**

```bash
mkdir -p data/epa && curl -sL -A 'Mozilla/5.0' -o data/epa/nla2022_hg.xlsx https://www.epa.gov/system/files/documents/2024-08/final-nla-2022-mercury-public-release-file-7-24-24.xlsx
uv run pytest pipeline/tests -v && uv run python -m pipeline.national data/epa/nla2022_hg.xlsx && cat web/public/data/national.json
```

Expected: `"all": {"mean": 0.284, "n": 413}` and `"LARGEMOUTH BASS": {"mean": 0.334, "n": 273}`.
- [ ] **Step 5: Commit** `git add pipeline web/public/data/national.json && git commit -m "feat(pipeline): EPA 2022 national lake mercury summary"`

---

### Task 5: Web scaffold and statistics

**Files:**
- Create: the `web/` Vite + Svelte 5 project, `web/src/lib/config.js`, `web/src/lib/format.js`, `web/src/lib/stats.js`, `web/tests/stats.test.js`, `web/tests/format.test.js`

**Interfaces:**
- **`config.js` exports:**
  - `EPA_GUIDELINE_PPM = 0.3`, `NEAR_LOWER_PPM = 0.2`
  - `PERIODS = [5, 10, 20, 'all']`, `DEFAULT_PERIOD = 10`
  - `LDH_ADVISORIES_URL = 'https://ldh.la.gov/page/2629'`
  - `NATIONAL_MIN_N = 5`
  - `BASINS`: `{ '01': 'Atchafalaya', '02': 'Barataria', '03': 'Calcasieu', '04': 'Lake Pontchartrain', '05': 'Mermentau', '06': 'Vermilion-Teche', '07': 'Mississippi River', '08': 'Ouachita', '09': 'Pearl', '10': 'Red', '11': 'Sabine', '12': 'Terrebonne' }`
  - `ALL_SPECIES = 'ALL'`
- **`format.js`:** `displaySpecies(name: string) -> string` (title case) and `formatPpm(v: number) -> string` (2 decimals).
- **`stats.js`**, all pure. `Years` is `{ [year: string]: [sum, count] }`.
  - `periodMean(years, period, latestYear) -> { mean, n } | null`
  - `yearlyMeans(years) -> [{ year: number, mean: number, n: number }]`, sorted by year
  - `trendClass(years) -> 'improving' | 'worsening' | 'flat' | 'insufficient'`
  - `changeSinceEarliest(years) -> { pct: number, early: [y0, y1], late: [y0, y1] } | null`
  - `mixedYears(site) -> Years`: all species pooled, for "All species (mixed)"
  - `speciesYears(site, species) -> Years | null`: returns `mixedYears(site)` when `species === ALL_SPECIES`
  - `groupMean(sites, species, period, latestYear, predicate = () => true) -> { mean, nSites } | null`: the mean of per-site `periodMean`s, skipping sites with none

**Trend method:**
- Least-squares slope of `yearlyMeans` against year, times 10, divided by the mean of the yearly means. That gives a fractional change per decade.
- `< -0.10` is improving and `> 0.10` is worsening; anything between is flat.
- Insufficient when there are fewer than 3 years or the span is under 5 years.

**Change since earliest:**
- Needs at least 4 distinct years.
- `k = min(3, floor(nYears / 2))`. "Early" is the sample-weighted mean of the first `k` years and "late" is the last `k`.
- `pct = Math.round((late - early) / early * 100)`. Return null if early is 0.

- [ ] **Step 1: Scaffold**

```bash
mkdir -p web && cd web && npm create vite@latest . -- --template svelte && npm i leaflet && npm i -D vitest @testing-library/svelte jsdom vite-plugin-pwa @playwright/test
```

In `vite.config.js`:
- `base: process.env.BASE_PATH ?? '/SafeCatchLA/'`
- `test: { environment: 'jsdom', include: ['tests/**/*.test.js'] }`
- `resolve.conditions: ['browser']`, needed for testing-library with Svelte 5

Scripts: `"test": "vitest run"`, `"e2e": "playwright test"`.

- [ ] **Step 2: Write failing tests**

```js
const Y = { '1994': [1.4, 2], '2000': [0.6, 2], '2016': [0.3, 1] };
test('periodMean', () => {
  expect(periodMean(Y, 10, 2026)).toBeNull();
  expect(periodMean(Y, 20, 2026)).toEqual({ mean: 0.3, n: 1 });
  expect(periodMean(Y, 'all', 2026)).toEqual({ mean: 0.46, n: 5 });
});
test('periodMean single sample', () => expect(periodMean({ '2020': [0, 1] }, 10, 2026)).toEqual({ mean: 0, n: 1 }));
test('trendClass', () => {
  expect(trendClass(Y)).toBe('improving');                       // ≈ -33%/decade
  expect(trendClass({ '2000': [0.5, 1], '2010': [0.5, 1], '2020': [0.5, 1] })).toBe('flat');
  expect(trendClass({ '2000': [0.2, 1], '2010': [0.4, 1], '2020': [0.6, 1] })).toBe('worsening');
  expect(trendClass({ '2000': [0.5, 1], '2020': [0.1, 1] })).toBe('insufficient');
  expect(trendClass({ '2018': [0.5, 1], '2019': [0.4, 1], '2020': [0.3, 1] })).toBe('insufficient');
});
test('changeSinceEarliest', () => {
  expect(changeSinceEarliest({ '1994': [0.8, 1], '1995': [0.6, 1], '2015': [0.3, 1], '2016': [0.2, 1] }))
    .toEqual({ pct: -64, early: [1994, 1995], late: [2015, 2016] });
  expect(changeSinceEarliest(Y)).toBeNull();
});
test('groupMean skips sites without period data', () => {
  const sites = [
    { basin: '05', species: { B: { years: { '2020': [0.4, 2] } } } },
    { basin: '05', species: { B: { years: { '2024': [0.6, 1] } } } },
    { basin: '01', species: { B: { years: { '1999': [9, 1] } } } },
  ];
  expect(groupMean(sites, 'B', 10, 2026)).toEqual({ mean: 0.4, nSites: 2 });
  expect(groupMean(sites, 'B', 10, 2026, s => s.basin === '01')).toBeNull();
});
test('mixedYears pools species', () => {
  expect(mixedYears({ species: { A: { years: { '2020': [1, 2] } }, B: { years: { '2020': [0.5, 1] } } } }))
    .toEqual({ '2020': [1.5, 3] });
});
test('format', () => {
  expect(displaySpecies('LARGEMOUTH BASS')).toBe('Largemouth Bass');
  expect(formatPpm(0.5312)).toBe('0.53');
});
```

Compare means with `toBeCloseTo` where floating point would otherwise bite.
- [ ] **Step 3: Run** `cd web && npm test`. Expected: FAIL.
- [ ] **Step 4: Implement** `config.js`, `format.js` and `stats.js`.
- [ ] **Step 5: Run** `npm test`. Expected: PASS.
- [ ] **Step 6: Commit** `git add web && git commit -m "feat(web): scaffold and statistics"`

---

### Task 6: Coloring, URL state, search

**Files:**
- Create: `web/src/lib/coloring.js`, `web/src/lib/urlState.js`, `web/src/lib/search.js`, `web/tests/coloring.test.js`, `web/tests/urlState.test.js`, `web/tests/search.test.js`

**Interfaces:**
- **`coloring.js`:**
  - `MODES = ['avg', 'latest', 'age', 'trend', 'count']`
  - `MODE_LABELS = { avg: 'Avg mercury vs EPA guideline', latest: 'Most recent sample', age: 'Age of last sample', trend: 'Trend', count: 'Number of samples' }`
  - `mercuryBand(v) -> 'below' | 'near' | 'above'`: below if `< 0.2`, near if `< 0.3`, otherwise above
  - `colorSite(site, { mode, species, period, latestYear, today }) -> { key: string, color: string }`. `today` is a `Date`.
  - `legendFor(mode) -> [{ key, label, color }]`
- **Colors (colorblind-safe):**
  - Mercury bands: below `#2c7bb6`, near `#fdae61`, above `#d7191c`.
  - Grey `#9e9e9e`, key `nodata`, label "No recent data". This covers no data in the period, or the filter species absent at the site.
  - **age:** key `recent` (< 5 yrs, `#08519c`), `mid` (5–15 yrs, `#6baed6`), `old` (≥ 15 yrs, `#c6dbef`). Years come from the latest sample of the species, or `site.last` for ALL.
  - **trend:** key `improving` (`#2c7bb6`), `flat` (`#bdbdbd`), `worsening` (`#d7191c`), `insufficient` (`#9e9e9e`).
  - **count:** key `few` (1–9, `#c6dbef`), `some` (10–49, `#6baed6`), `many` (50+, `#08519c`).
  - Count and trend ignore the period and use full history. avg and latest respect the period: latest is grey if its date is before the period start.
- **`urlState.js`:**
  - `DEFAULTS = { site: null, species: null, filter: 'ALL', period: 10, color: 'avg', compare: null }`
  - `parseHash(hash: string) -> typeof DEFAULTS`
  - `toHash(state) -> string`. It omits defaults, uses `encodeURIComponent`, and returns `''` when everything is default.
- **`search.js`:** `searchSites(sites, query, limit = 8) -> site[]`. Case-insensitive substring match on `name` and `address`. Name matches rank before address matches. Queries shorter than 2 characters after trim return `[]`.

- [ ] **Step 1: Write failing tests**

```js
const site = { last: '2016-09-14', species: { B: { n: 3, latest: ['2016-09-14', 0.31], years: { '1994': [1.4, 2], '2016': [0.31, 1] } } } };
const ctx = { species: 'B', period: 'all', latestYear: 2026, today: new Date('2026-10-24') };
test('mercuryBand edges', () => {
  expect([0.19, 0.2, 0.29, 0.3].map(mercuryBand)).toEqual(['below', 'near', 'near', 'above']);
});
test('colorSite modes', () => {
  expect(colorSite(site, { ...ctx, mode: 'avg' }).key).toBe('above');      // (1.4+0.31)/3 = 0.57
  expect(colorSite(site, { ...ctx, mode: 'latest' }).key).toBe('above');
  expect(colorSite(site, { ...ctx, mode: 'age' }).key).toBe('mid');         // 10.1 years
  expect(colorSite(site, { ...ctx, mode: 'count' }).key).toBe('few');
});
test('colorSite no recent data', () => {
  expect(colorSite(site, { ...ctx, period: 5, mode: 'avg' })).toEqual({ key: 'nodata', color: '#9e9e9e' });
  expect(colorSite(site, { ...ctx, period: 5, mode: 'latest' }).key).toBe('nodata');
  expect(colorSite(site, { ...ctx, species: 'OTHER', mode: 'avg' }).key).toBe('nodata');
});
test('legendFor lists nodata last for avg', () => {
  expect(legendFor('avg').map(l => l.key)).toEqual(['below', 'near', 'above', 'nodata']);
});
test('parseHash valid', () => {
  expect(parseHash('#site=0436&species=LARGEMOUTH%20BASS&period=all&color=age&filter=BOWFIN'))
    .toEqual({ site: '0436', species: 'LARGEMOUTH BASS', filter: 'BOWFIN', period: 'all', color: 'age', compare: null });
});
test('parseHash ignores bad values', () => {
  expect(parseHash('#period=7&color=rainbow&junk')).toEqual(DEFAULTS);
  expect(parseHash('')).toEqual(DEFAULTS);
});
test('toHash round trip and omits defaults', () => {
  const s = { ...DEFAULTS, site: '0436', species: 'LARGEMOUTH BASS' };
  expect(parseHash(toHash(s))).toEqual(s);
  expect(toHash(DEFAULTS)).toBe('');
});
test('searchSites', () => {
  const sites = [{ id: '1', name: 'Vermilion River North of Perry', address: '2.1 miles south of Abbeville' },
                 { id: '2', name: 'Abbeville Canal', address: '' }];
  expect(searchSites(sites, 'abbeville').map(s => s.id)).toEqual(['2', '1']);
  expect(searchSites(sites, ' a')).toEqual([]);
});
```

- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** the three modules.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -am "feat(web): site coloring, URL state, search"`. Add the new files to git first.

---

### Task 7: Map screen

**Files:**
- Create: `web/src/lib/data.js`, `web/src/lib/state.svelte.js`, `web/src/components/MapView.svelte`, `TopBar.svelte`, `Legend.svelte`, `web/tests/topbar.test.js`
- Modify: `web/src/App.svelte`, `web/src/main.js`, `web/index.html`, `web/src/app.css`. Delete the Vite demo files.

**Interfaces:**
- **`data.js`:** `loadSites()`, `loadMeta()`, `loadNational()` and `loadSiteDetail(id)`. Each fetches `${import.meta.env.BASE_URL}data/...`. `loadSiteDetail` caches per id in a `Map`.
- **`state.svelte.js`:** exports `app`, a `$state` object with the `DEFAULTS` keys plus `sites`, `latestYear`, `meta` and `national`. It also exports:
  - `initFromHash()`, which also listens to `hashchange`
  - `update(patch)`, which writes `location.hash` via `history.replaceState`
  - `selectedSite()`, which returns the site object or null. An unknown id resolves to null.
- **MapView:**
  - Leaflet map centred `[31.0, -91.9]` at zoom 7, with tiles `https://tile.openstreetmap.org/{z}/{x}/{y}.png` and attribution "© OpenStreetMap contributors".
  - Each site is an `L.circleMarker` (SVG renderer, radius 9, white 2px stroke, fill from `colorSite`). Markers restyle when `filter`, `color` or `period` change.
  - Clicking a marker calls `update({ site: id, species: <site species with most samples> })`.
  - The selected site gets a black 3px stroke.
- **TopBar:**
  - A search input showing up to 8 `searchSites` results in a list. Choosing one pans to the site and selects it.
  - Three compact controls: species filter (`All species` + every species in `sites`, sorted by sample count), "Color by" (`MODE_LABELS`) and "Period" (`Last 5 yrs`, `Last 10 yrs`, `Last 20 yrs`, `All years`).
  - A 📍 button calls `navigator.geolocation.getCurrentPosition` and pans to the position at zoom 11. If permission is denied it shows "Location unavailable" for 3 s.
- **Legend:**
  - Renders `legendFor(app.color)`. When the filter is ALL and the mode is avg, latest or trend, it adds "All species (mixed)".
  - A collapsible ⓘ explains "Colors compare the average to the EPA guideline (0.3 ppm) for the selected period."
  - Footer line: "Data: Louisiana DEQ, updated {meta.updated} · National: EPA 2022".
- **Layout:**
  - Mobile-first. The map fills the viewport (`100dvh`), and the top bar and legend overlay it.
  - Controls are ≥ 44px tall.
  - Desktop breakpoint `min-width: 768px` is used by Task 8.

- [ ] **Step 1: Write failing test** in `tests/topbar.test.js`. Render TopBar with 2 fixture sites. Type "abbe" into the search and assert 2 results appear. Change the period select to "all" and assert `app.period === 'all'`.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** the files above.
- [ ] **Step 4: Run** `npm test`, then `npm run dev`. Open http://localhost:5173/SafeCatchLA/ at a phone-sized viewport. Expected:
  - The map shows about 300 colored dots.
  - Changing "Color by" recolors them and updates the legend.
  - Search "Henderson" finds Lake Henderson.
- [ ] **Step 5: Commit** `git add web && git commit -m "feat(web): interactive map, filters, search, legend"`

---

### Task 8: Site sheet / drawer

**Files:**
- Create: `web/src/components/SiteSheet.svelte`, `SpeciesChips.svelte`, `HeadlineStats.svelte`, `Disclaimer.svelte`, `TrendChart.svelte`, `CompareBars.svelte`, `AllSpeciesList.svelte`, `web/tests/sheet.test.js`
- Modify: `web/src/App.svelte`, which renders `<SiteSheet>` when `selectedSite()` is non-null

**Interfaces:**
- **SiteSheet** props: `{ site, national, latestYear, period }`. It loads the detail with `loadSiteDetail(site.id)` for TrendChart dots.
  - **Mobile:** fixed bottom sheet with states `'peek'` (about 45dvh) and `'expanded'` (about 92dvh).
  - The handle is a `<button aria-label="Expand details">` (or "Collapse details") that toggles state.
  - Pointer drag on the handle: up 40px goes to expanded; down 40px goes from expanded to peek, or from peek to closed.
  - Closing (✕ button, drag down from peek, or `Escape`) calls `update({ site: null, species: null, compare: null })`.
  - **Desktop (≥ 768px):** a right drawer 400px wide, always showing the expanded content.
  - The header shows the name, the address (if any), the basin name, "{n} samples · last {year}", and a share button. Share calls `navigator.share({ url })` if available, else copies the URL and shows "Link copied".
- **SpeciesChips:** horizontal scroll row of the site's species, sorted by `n` descending. Selecting one calls `update({ species })`.
- **HeadlineStats:** three tiles for the selected species:
  - "avg ppm": `periodMean` plus "{n} samples · last {k} yrs" (or "all years"). If there's nothing in the period it shows "—" and "No samples in period".
  - "latest": `latest[1]` plus the year.
  - "change": `changeSinceEarliest` as "↓64%" or "↑12%" with "since {early[0]}–{early[1] % 100}". If null it shows "—" and "Not enough years".
- **Disclaimer:** the exact copy and link from Global Constraints. It is visible in both peek and expanded.
- **TrendChart:**
  - SVG with a `viewBox` that scales to width.
  - Plots `yearlyMeans` over the full history as a line with points, plus individual samples as faint dots from the detail.
  - Dashed reference lines are labelled "EPA guideline (0.3 ppm)" and "Louisiana avg {x}" (from `groupMean` over all sites, same period).
  - The y-axis runs from 0 to max(1.2 × data max, 0.35).
  - Tapping a year point shows "{year}: {mean} ppm ({n} samples)".
- **CompareBars:**
  - Has its own species `<select>`, defaulting to the chip species and bound to `app.compare`. Options are the site's species plus "All species (mixed)".
  - Four rows:
    - This site: `periodMean`, "{n} samples"
    - "{Basin name} basin": `groupMean` with the same basin, "{n} sites". The row is omitted if the site has no basin.
    - Louisiana: `groupMean` over all sites, "{n} sites"
    - "U.S. lakes (EPA 2022)": the `national.species[KEY]` mean, or `national.all` for mixed. If absent it shows the text "no national data" and no bar.
  - A dashed vertical line marks 0.3.
- **AllSpeciesList:** the site's species with `periodMean` sorted descending as "{Species} {ppm} ({n})" with a small band-colored bar. Species with nothing in the period are listed after, as "{Species}: no samples in period".

- [ ] **Step 1: Write failing tests** in `tests/sheet.test.js`. Use a fixture site with 2 species, mock `loadSiteDetail`, and a fixture `national` that has bass but not bowfin.

```js
test('shows disclaimer and LDH link', ...)       // getByText(/This is not health advice/), link href === LDH_ADVISORIES_URL
test('headline uses selected period', ...)       // period 'all' shows "0.57"; period 5 shows "No samples in period"
test('CompareBars shows no national data', ...)  // select BOWFIN in compare select -> getByText('no national data')
test('expand button toggles state', ...)         // click "Expand details" -> button label becomes "Collapse details"
test('all species list orders by mean', ...)     // first item text starts with the higher-mean species
```

Each test body asserts exactly what its comment states.
- [ ] **Step 2: Run** `npm test`. Expected: FAIL.
- [ ] **Step 3: Implement** the components.
- [ ] **Step 4: Run** `npm test`, then `npm run dev`. Check at a phone-sized viewport and at desktop width. Expected:
  - Tapping Lake Henderson opens peek with Largemouth Bass first.
  - Dragging or tapping the handle expands it.
  - Compare shows 4 rows for bass, and "no national data" for bowfin.
  - Desktop shows a right drawer.
- [ ] **Step 5: Commit** `git add web && git commit -m "feat(web): site drawer with history, comparisons, disclaimer"`

---

### Task 9: Offline support and mobile smoke test

**Files:**
- Modify: `web/vite.config.js`, `web/index.html` (theme-color, `apple-touch-icon`, description)
- Create: `web/public/icon-192.png`, `web/public/icon-512.png` (a simple fish glyph on a blue `#2c7bb6` square), `web/playwright.config.js`, `web/e2e/smoke.spec.js`

**Interfaces:**
- **vite-plugin-pwa** with `registerType: 'autoUpdate'`:
  - The manifest name is "SafeCatchLA", with short_name "SafeCatchLA" and `display: 'standalone'`.
  - Workbox precaches the app shell.
  - `runtimeCaching` for `/data/` uses `NetworkFirst` with `networkTimeoutSeconds: 4` and cache name `data`.
  - Map tiles are not cached, per the OSM tile usage policy.
- **Playwright:** `webServer: { command: 'npm run build && npm run preview -- --port 4173', url: 'http://localhost:4173/SafeCatchLA/' }`, using the project `devices['Pixel 7']`.

- [ ] **Step 1: Write the e2e tests** in `e2e/smoke.spec.js`:

```js
test('tap a site opens sheet with disclaimer', async ({ page }) => {
  await page.goto('/SafeCatchLA/');
  await page.locator('path.leaflet-interactive').first().click();
  await expect(page.getByText(/This is not health advice/)).toBeVisible();
});
test('deep link opens Lake Henderson', async ({ page }) => {
  await page.goto('/SafeCatchLA/#site=0436');
  await expect(page.getByText(/Lake Henderson/).first()).toBeVisible();
});
test('bad deep link still loads map', async ({ page }) => {
  await page.goto('/SafeCatchLA/#site=nope&period=7&color=zzz');
  await expect(page.locator('path.leaflet-interactive').first()).toBeVisible();
  await expect(page.getByText(/This is not health advice/)).toHaveCount(0);
});
test('never requests DEQ', async ({ page }) => {
  const hosts = [];
  page.on('request', r => hosts.push(new URL(r.url()).host));
  await page.goto('/SafeCatchLA/#site=0436');
  await page.waitForLoadState('networkidle');
  expect(hosts.filter(h => h.includes('deq.louisiana.gov'))).toEqual([]);
});
```

- [ ] **Step 2: Run** `npx playwright install chromium && npm run e2e`. Expected: tests from earlier tasks pass, and any failures point to gaps to fix here.
- [ ] **Step 3: Implement** the PWA config and icons, and fix whatever the e2e run exposed.
- [ ] **Step 4: Run** `npm test && npm run e2e`. Expected: all PASS. Then `npm run build`. Expected: `dist/manifest.webmanifest` and `dist/sw.js` exist. Report the gzipped JS bundle size from the Vite output.
- [ ] **Step 5: Commit** `git add web && git commit -m "feat(web): offline support and mobile smoke tests"`

---

### Task 10: GitHub repo, refresh workflow, Pages deploy

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md` (what it is, data sources, how to run the pipeline and app locally, and the disclaimer)

**Interfaces:**
- **Workflow `deploy.yml`:**
  - Triggers: `schedule: cron '0 11 * * 1'` (Mondays 11:00 UTC), `workflow_dispatch`, and `push` to `main`.
  - `concurrency: { group: pages, cancel-in-progress: false }`
- **Job `refresh`** (`if: github.event_name != 'push'`; `permissions: contents: write`):
  1. checkout; `astral-sh/setup-uv`; `uv sync`; `uv run pytest pipeline/tests`
  2. `uv run python -m pipeline.fetch`. A failure fails the job, which stops deploy and leaves the published data untouched.
  3. `uv run python -m pipeline.build`
  4. `actions/upload-artifact` uploads `data/raw/` as `deq-raw` with `retention-days: 30`.
  5. `if ! git diff --quiet web/public/data`, commit as `github-actions[bot]` with message `data: refresh from LDEQ (<meta.updated>)` and push.
  6. Output `changed=true|false`.
- **Job `deploy`:**
  - `needs: refresh`
  - `if: always() && (needs.refresh.result == 'success' || needs.refresh.result == 'skipped')`
  - `permissions: pages: write, id-token: write, contents: read`
  - environment `github-pages`
  - Steps:
    1. checkout `ref: main`, so it picks up the data commit
    2. `actions/setup-node` (node 22, npm cache `web/package-lock.json`)
    3. `npm ci && npm test && npm run build` in `web/`
    4. `actions/configure-pages`, `actions/upload-pages-artifact` (`web/dist`), `actions/deploy-pages`

- [ ] **Step 1: Write** `deploy.yml` and `README.md`.
- [ ] **Step 2: Validate locally.** Run `uv run pytest pipeline/tests && (cd web && npm ci && npm test && npm run build)`. Expected: PASS. If `actionlint` is available, run `actionlint .github/workflows/deploy.yml` (`brew install actionlint`). Expected: no errors.
- [ ] **Step 3: Commit** `git add -A && git commit -m "ci: weekly LDEQ refresh and Pages deploy"`
- [ ] **Step 4: Ask the user before any outward-facing step.** Creating a public repo and pushing are visible to others. Once confirmed:

```bash
gh repo create NickLD/SafeCatchLA --public --source . --push
gh api -X POST repos/NickLD/SafeCatchLA/pages -f build_type=workflow
gh workflow run deploy.yml && sleep 5 && gh run watch "$(gh run list --workflow deploy.yml -L1 --json databaseId -q '.[0].databaseId')"
```

- [ ] **Step 5: Verify.** Run `curl -sI https://nickld.github.io/SafeCatchLA/ | head -1` and `curl -s https://nickld.github.io/SafeCatchLA/data/meta.json`. Expected: `HTTP/2 200`, and meta JSON with `"guidelinePpm":0.3`. Open the URL on a phone (or emulation) and repeat the Task 8 Step 4 checks.
