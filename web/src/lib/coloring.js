// What a site's map dot color means, for each "Color by" mode.
import { ALL_SPECIES, EPA_GUIDELINE_PPM, NEAR_LOWER_PPM } from './config.js';
import { periodMean, periodStartYear, speciesYears, trendClass } from './stats.js';

export const MODES = ['avg', 'latest', 'age', 'trend', 'count'];
export const MODE_LABELS = {
  avg: 'Avg mercury vs EPA guideline',
  latest: 'Most recent sample',
  age: 'Age of last sample',
  trend: 'Trend',
  count: 'Number of samples',
};
export const MODE_SHORT = { avg: 'Avg vs EPA', latest: 'Latest', age: 'Sample age', trend: 'Trend', count: 'Samples' };

const NODATA = { key: 'nodata', label: 'No recent data', color: '#9e9e9e' };
const BANDS = [
  { key: 'below', label: `Below ${NEAR_LOWER_PPM} ppm`, color: '#2c7bb6' },
  { key: 'near', label: `Near EPA guideline (${NEAR_LOWER_PPM}–${EPA_GUIDELINE_PPM})`, color: '#fdae61' },
  { key: 'above', label: `At or above EPA guideline (${EPA_GUIDELINE_PPM} ppm)`, color: '#d7191c' },
];
const LEGENDS = {
  avg: [...BANDS, NODATA],
  latest: [...BANDS, NODATA],
  age: [
    { key: 'recent', label: 'Under 5 years ago', color: '#08519c' },
    { key: 'mid', label: '5–15 years ago', color: '#6baed6' },
    { key: 'old', label: '15+ years ago', color: '#c6dbef' },
    { ...NODATA, label: 'No samples' },
  ],
  trend: [
    { key: 'improving', label: 'Improving', color: '#2c7bb6' },
    { key: 'flat', label: 'No clear change', color: '#bdbdbd' },
    { key: 'worsening', label: 'Worsening', color: '#d7191c' },
    { key: 'insufficient', label: 'Too little data', color: '#9e9e9e' },
  ],
  count: [
    { key: 'few', label: '1–9 samples', color: '#c6dbef' },
    { key: 'some', label: '10–49 samples', color: '#6baed6' },
    { key: 'many', label: '50+ samples', color: '#08519c' },
    { ...NODATA, label: 'No samples' },
  ],
};

export function mercuryBand(v) {
  if (v < NEAR_LOWER_PPM) return 'below';
  if (v < EPA_GUIDELINE_PPM) return 'near';
  return 'above';
}

export function legendFor(mode) {
  return LEGENDS[mode];
}

function pick(mode, key) {
  const { color } = LEGENDS[mode].find((l) => l.key === key);
  return { key, color };
}

function speciesEntries(site, species) {
  if (species === ALL_SPECIES) return Object.values(site.species);
  const sp = site.species[species];
  return sp ? [sp] : [];
}

function latestOf(entries) {
  const date = entries.reduce((d, e) => (e.latest[0] > d ? e.latest[0] : d), '');
  const vals = entries.filter((e) => e.latest[0] === date).map((e) => e.latest[1]);
  return [date, vals.reduce((a, b) => a + b, 0) / vals.length];
}

export function colorSite(site, { mode, species, period, latestYear, today }) {
  const entries = speciesEntries(site, species);
  if (!entries.length) return pick(mode, 'nodata');
  switch (mode) {
    case 'avg': {
      const m = periodMean(speciesYears(site, species), period, latestYear);
      return pick(mode, m ? mercuryBand(m.mean) : 'nodata');
    }
    case 'latest': {
      const [date, value] = latestOf(entries);
      if (Number(date.slice(0, 4)) < periodStartYear(period, latestYear)) return pick(mode, 'nodata');
      return pick(mode, mercuryBand(value));
    }
    case 'age': {
      const [date] = latestOf(entries);
      const years = (today - new Date(date)) / (365.25 * 24 * 3600 * 1000);
      return pick(mode, years < 5 ? 'recent' : years < 15 ? 'mid' : 'old');
    }
    case 'trend':
      return pick(mode, trendClass(speciesYears(site, species)));
    case 'count': {
      const n = entries.reduce((a, e) => a + e.n, 0);
      return pick(mode, n < 10 ? 'few' : n < 50 ? 'some' : 'many');
    }
    default:
      throw new Error(`unknown color mode ${mode}`);
  }
}
