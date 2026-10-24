# SafeCatchLA: Louisiana Fish Mercury Map, Design

Date: 2026-10-24

**Name:** SafeCatchLA (user's choice).
**Repo:** `NickLD/SafeCatchLA` on GitHub; the `gh` CLI is already authenticated as NickLD.
**Domain:** start at `nickld.github.io/SafeCatchLA`. `safecatchla.com`, `.org` and `.app` were all unregistered on 2026-10-24, and a custom domain may come later *(Claude's call to start without one)*. The app's base path must be a single build setting, so moving to a custom domain needs only that setting changed plus a CNAME.

## Intent

A mobile-first web map that lets Louisiana anglers look up mercury levels in fish at the places they fish, and see whether those places are getting better over time.

The data is LDEQ's Mercury Initiative (project WQ1994001), published at https://waterdata.deq.louisiana.gov/MercuryData. That page is a raw data table that is hard to use on a phone and hard to interpret. This app turns it into "tap where I fish → see how the fish I catch compare, and the trend."

**Primary user:** a local fisherman on a smartphone, possibly at a boat launch with weak signal. They are not scientists. They want to know: how high is mercury here for my species, how does it compare to elsewhere, and is it improving?

## Goals

- An interactive map of every mercury fish-tissue sampling site in Louisiana, plotted by latitude and longitude.
- Tapping a site opens a drawer with that site's history, broken down by species, in several chart formats.
- Compare a site/species against an advisory reference line and against other groupings: same basin, statewide, national.
- The map's site coloring can be chosen by the user.
- Works well on phones first; desktop is secondary but supported.
- Hosted on GitHub Pages. Data refreshes automatically via CI, so visitors never hit DEQ's servers.

## Non-goals

- Other LDEQ datasets (general water quality, the other 225 projects). Explored, and the endpoints are known (see `fetch_ldeq.py`), but out of scope for now.
- Water and sediment mercury results. Fish tissue only for v1 (see Data rules).
- User accounts, saved sites, comments, or any server-side component.
- Telling people how many meals they can safely eat.

## Anti-goals (would make this a failure even if it works)

- **Looking like official health advice.** The app must not compute meal limits or say "safe to eat." It shows measurements and comparisons, with a clear disclaimer that levels may exceed advisory thresholds, and points to LDH's official advisories.
- **Misleading averages.** Mixing species together, or averaging in a way that contradicts the state's own protocol, would give anglers wrong impressions.
- **Hammering DEQ's servers.** Visitors' browsers must never call DEQ. Only the scheduled CI job does, at a low frequency.
- **A desktop app squeezed onto a phone.** Mobile is the primary experience.

## Data source

Single unauthenticated endpoint, no parameters:

```
GET https://waterdata.deq.louisiana.gov/api/ProjectsPublicData/GetMercuryDataFromView
```

Returns a JSON array (~36 MB, ~52k rows as of 2026-10-24). An existing script, `fetch_mercury.py`, downloads it to `data/mercury_raw.json` and `data/mercury.csv`.

Relevant fields per row: `SITE`, `SITE_NAME`, `SUBSEGMENT_NUMBER`, `COLLECTION_DATE`, `MATRIX`, `PARAMETER`, `RESULT`, `UNITS`, `MDL`, `PRACTICAL_QUANTITATION_LIMIT`, `INTERPRETED_QUALIFIER`, `LAB_FIELD_QUALIFIER`, `TAXA_COMMON_NAME`, `AVERAGE_FISH_WEIGHT`, `AVERAGE_FISH_LENGTH`, `NUMBEROFFISH` (Single/Composite), `NUMBER_OF_FISH`, `LAT_WGS84`, `LON_WGS84`.

Observed facts (2026-10-24 pull):
- 664 sites, all with coordinates inside Louisiana. Dates from 1993 to 2026.
- Only ~22.9k rows are `PARAMETER = MERCURY`. The rest are pH, temperature, DO, etc.
- Mercury fish tissue (`MATRIX = TE`): 19,780 rows, 77 species, units `ppm` (11,852), `ug/g` (7,925), and `mg/kg` (3). All three are numerically equivalent.
- 170 tissue rows have a null `RESULT` (presumably non-detects; see Data rules).
- The most-sampled site is 0436, Lake Henderson (360 tissue samples).

Lookup tables (matrix codes, qualifiers, subsegments) are available from LDEQ reference endpoints. `fetch_ldeq.py meta` already downloads them to `data/meta/`. The subsegment reference may map subsegments to basins (see Groupings).

## Data rules

These follow Louisiana's own advisory protocol ("Protocol for Issuing Public Health Advisories for Chemical Contaminants in Recreationally Caught Fish and Shellfish," LDH/LDEQ/LDWF, 2012, https://www.deq.louisiana.gov/assets/docs/Water/LAFishProtocol.pdf, Table 1):

- **Fish tissue mercury only:** `PARAMETER = MERCURY` and `MATRIX = TE`.
- **Units:** treat `ppm`, `ug/g`, and `mg/kg` as the same (display as ppm). Any other unit is excluded and logged by the pipeline.
- **Averages are arithmetic means, always per species.** Never average across species for any value that is compared to a threshold. An "all species" view may be shown in places, labelled as such, but it is not the basis for coloring against the advisory line unless the user explicitly picks it.
- **Non-detects:** count as zero, unless more than half of a waterbody's samples are above the reporting limit, in which case non-detects count as ½ the reporting limit.
  - **Encoding (verified 2026-10-24):** a non-detect is a row with null `RESULT` and a `U` in `LAB_FIELD_QUALIFIER` (158 rows) or `INTERPRETED_QUALIFIER` (12 rows). A row with a numeric `RESULT` and a `U` qualifier is also a non-detect, with `RESULT` taken as its reporting limit.
  - **Applied per site + species** *(Claude's call)*, consistent with per-species averaging. Basin and statewide figures use the site-level values after substitution; they are not recomputed at group level.
  - **Reporting limit** = `PRACTICAL_QUANTITATION_LIMIT` if > 0, else `MDL` if > 0, else the non-detect counts as zero.
- **Rejected results:** exclude rows with `VALIDATION_QUALIFIER = R` (26 tissue rows) *(Claude's call: R means rejected in validation)*.
- **Composite samples:** treat each composite result as one sample, as the protocol does.

## Averaging period

The average period is the time window behind every "average" in the app (user's decision):

- **Default: the last 10 years** of samples, counted back from the date of the newest sample in the dataset. This applies to the map coloring, headline average, Compare chart, and "All species here."
- **User-selectable:** visitors can switch the period (e.g. last 5 years, last 10 years, last 20 years, all years). The builder picks the exact choices. The setting applies app-wide and is kept in the share URL.
- **Trend chart:** always shows the full history, regardless of the period setting.
- **Sites with no samples in the selected period:** show as "no recent data" on the map (grey), not hidden. Their drawer still shows full history *(Claude's call)*.
- **Pre-computing:** because the period is switchable, `sites.json` must carry enough to compute averages for every offered period without loading per-site files. One way is per-species, per-year sums and counts. The builder chooses.
- **U.S. lakes figure:** always labelled "(EPA 2022)", since its period can't match.

## Reference lines and comparisons

- **Advisory reference line:** EPA's fish-tissue methylmercury criterion, **0.3 ppm**. This is used because Louisiana issues advisories through a per-species meal-limit calculation, not a single ppm cutoff, and we will not reproduce that calculation. Label it "EPA guideline (0.3 ppm)", not "Louisiana advisory." Keep the value in one config constant.
- **National comparison:** EPA 2022 National Lakes Assessment fish tissue study, mercury data file:
  https://www.epa.gov/system/files/documents/2024-08/final-nla-2022-mercury-public-release-file-7-24-24.xlsx
  - 413 fillet composites. Results are in ng/g (ppb), so divide by 1000 for ppm. Join species via "EPA Sample ID" on the Sample Info sheet.
  - Simple (unweighted) means: all samples 0.28 ppm; Largemouth Bass 0.33 (n=273); Bluegill 0.11; Black Crappie 0.14.
  - Many Louisiana species have no national data (bowfin, catfish, drum). Show "no national data" rather than a bar.
  - Label it "U.S. lakes (EPA 2022)" so it's clear these are unweighted lake-only means.
  - This is a static file. Process it once and commit the summary; it does not need the CI refresh.
- **Statewide and basin comparisons are a mean of site means** *(Claude's call)*: each site counts once, so heavily sampled sites like Lake Henderson don't dominate. Show these as "n sites", not "n samples".
- **Basin grouping:** characters 3–4 of `SUBSEGMENT_NUMBER` (e.g. `LA050401_00` → `05`) are Louisiana's 12 standard river basins:

  | Code | Basin | Code | Basin |
  |------|-------|------|-------|
  | 01 | Atchafalaya | 07 | Mississippi River |
  | 02 | Barataria | 08 | Ouachita |
  | 03 | Calcasieu | 09 | Pearl |
  | 04 | Lake Pontchartrain | 10 | Red |
  | 05 | Mermentau | 11 | Sabine |
  | 06 | Vermilion-Teche | 12 | Terrebonne |

  The reference table has no basin names, so these are hard-coded. The builder should verify them against LDEQ's basin list. Code `00` appears on 356 tissue rows; the builder should check what it means and, if it is unknown, treat it as "no basin".

## Site coloring (map)

The user picks what the site color means. The legend updates to match. Options:

1. **Avg mercury vs EPA guideline** (default): below, near, above 0.3 ppm. The builder picks the "near" band.
2. **Most recent sample result**, using the same bands.
3. **Age of last sample:** e.g. <5 yrs, 5–15 yrs, 15+ yrs.
4. **Trend:** improving, worsening, flat, or too little data. The builder chooses a simple, explainable method (e.g. compare early-period vs recent-period means, or a regression slope over yearly means with a minimum number of years).
5. **Number of samples.**

A species filter applies to the coloring. "All species" is allowed, but for options 1, 2, and 4 the app should make clear that the value is mixed-species.

## User experience

### Mobile (primary)

**Map screen:**
- Full-screen map, with a search box at the top for lake, river, or town (searching site names).
- Two compact pills: species filter, and "color sites by."
- Large tap targets for site dots.
- A "near me" button that uses browser geolocation.
- A small legend with an ⓘ that explains the colors and the EPA guideline.

**Bottom sheet:** tapping a site opens a sheet with three states.

1. **Peek:**
   - site name, nearby town, sample count, and year of last sample
   - species chips (swipeable, ordered by sample count)
   - three headline numbers for the selected species: average ppm, latest result, and change vs. the earliest period
   - the disclaimer
2. **Expanded (drag up):**
   - the full history for the selected species
   - a trend chart of yearly averages, with the EPA 0.3 ppm line and the statewide average line
   - the "Compare" chart: this site vs basin vs Louisiana vs U.S. lakes. It has its own species dropdown, independent of the chips.
   - "All species here": per-species averages at this site, ranked
3. **Dismiss:** drag down or tap the map.

**Disclaimer**, in the drawer whenever data is shown: averages may exceed advisory levels; this is not health advice; check the Louisiana Department of Health's current fish consumption advisories (link to https://ldh.la.gov/page/2629).

Every number shows its sample count, so "0.53 ppm (157 samples)" can't be mistaken for one fish.

**Share:** a shareable URL that encodes the selected site and species, e.g. `#site=0436&species=LARGEMOUTH_BASS`.

### Desktop

Same content, with the bottom sheet rendered as a right-side drawer next to the map.

### Mockups

Brainstorm mockups are in `.superpowers/brainstorm/*/content/`: `layout-v2.html` (desktop) and `mobile.html` (three phone states). They are sketches, not pixel specs.

## Architecture

```
GitHub Actions (scheduled)
  └─ fetch DEQ endpoint → build step (Python) → public/data/*.json
       └─ commit only if output changed → triggers Pages deploy
GitHub Pages
  └─ Svelte static app → loads public/data/*.json (never calls DEQ)
```

### Frontend (decided)

- **Svelte** (user chose Svelte/Vue; Svelte picked for small bundles on mobile).
- Static build deployed to GitHub Pages.
- **Map:** Leaflet with OpenStreetMap tiles (free, no API key, good touch support).
- **Charts:** a lightweight chart library suited to mobile; the builder chooses.

### Data build (decided in principle)

A Python build script turns the raw DEQ JSON into small pre-computed files the app loads. Suggested shape:

- **`sites.json`** (loaded at startup; must be small): per site, the id, name, lat/lon, basin, sample count, last sample date, and per-species summary stats. The per-species stats should be enough to color the map under every coloring option without loading more data: mean, latest result, sample count, and trend class.
- **`sites/<id>.json`** (loaded on tap): per-species yearly means and individual sample results for charts.
- **`groups.json`:** per-species means for each basin, statewide, and U.S. lakes.
- **`meta.json`:** data pulled-at timestamp, DEQ row counts, and EPA guideline value.

The app shows "Data from LDEQ, updated <date>" using `meta.json`.

### CI refresh (decided in principle)

- Scheduled GitHub Actions workflow, weekly by default, plus manual trigger.
- Fetches the DEQ mercury endpoint once. It also fetches the DEQ sites list (`/api/SitesData/GetSiteMap_FromView`, ~850 KB), which supplies each site's `address` text (e.g. "2.1 miles south of Abbeville…") *(Claude's call)*. This text is used for the "nearby town" line and for town search. Two requests a week total.
- Runs the build and commits the output only if it changed. The same workflow then builds and deploys Pages *(Claude's call)*, because a commit made with the default `GITHUB_TOKEN` does not trigger other workflows.
- Visitors only ever load files from GitHub Pages.
- Cache the last good raw download (Actions cache or artifact). If DEQ is down or returns something malformed (empty array, missing fields, row count drops sharply), the job fails loudly and the published data stays as it was.

### Offline / weak signal (builder's guess, user did not object)

Cache the app shell and the last-loaded data (service worker) so the app opens with stale data when there is no signal, with the "updated <date>" shown.

## Left to the builder

- Chart library, and chart styling.
- Exact color bands and the "near" margin around 0.3 ppm. Colors must be colorblind-safe and readable in sunlight.
- Trend method and minimum data requirements.
- Map tile provider details, clustering of nearby dots if needed.
- Repo layout, Svelte vs SvelteKit (static adapter), tests.
- Exact JSON shapes and file sizes, keeping `sites.json` small enough for a fast first load on mobile.
- Accessibility basics: tap targets, contrast, labelled controls.
