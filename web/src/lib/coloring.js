// What a site's map dot color means, for each "Color by" mode.
import { ALL_SPECIES, EPA_GUIDELINE_PPM, NEAR_LOWER_PPM } from './config.js';
import { periodMean, periodStartYear, speciesYears, trendClass } from './stats.js';

export const MODES = ['avg', 'latest', 'age', 'trend'];
export const MODE_LABELS = {
  avg: 'Average mercury concentration',
  latest: 'Most recent sample',
  age: 'Age of last sample',
  trend: 'Trend',
};
export const MODE_SHORT = { avg: 'Avg mercury', latest: 'Latest mercury', age: 'Sample age', trend: 'Trend' };

const NODATA_COLOR = '#9e9e9e';
// ColorBrewer RdYlBu, split at the EPA guideline: blue side below it, red side above it.
const BELOW = ['#4575b4', '#91bfdb', '#e0f3f8', '#ffffbf'];
const ABOVE = ['#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026'];
const BLUES_DARK_TO_LIGHT = ['#08306b', '#2171b5', '#6baed6', '#c6dbef'];

const MERCURY_SCALE = {
  kind: 'diverging', range: [0, 1], minBounds: [0, 0.29], maxBounds: [0.31, 3], step: 0.01,
  handles: ['Deepest blue at', 'Deepest red at'], unit: 'ppm',
};
// Continuous scales; the range is where the end colors are reached (values beyond clamp).
export const SCALES = {
  avg: MERCURY_SCALE,
  latest: MERCURY_SCALE,
  age: {
    kind: 'sequential', colors: BLUES_DARK_TO_LIGHT, range: [0, 30], minBounds: [0, 29], maxBounds: [1, 60], step: 1,
    handles: ['Darkest at', 'Lightest at'], unit: 'yrs ago',
  },
};

const TREND_LEGEND = [
  { key: 'improving', label: 'Improving', color: '#2c7bb6' },
  { key: 'flat', label: 'No clear change', color: '#bdbdbd' },
  { key: 'worsening', label: 'Worsening', color: '#d7191c' },
  { key: 'insufficient', label: 'Too little data', color: NODATA_COLOR },
];

export function mercuryBand(v) {
  if (v < NEAR_LOWER_PPM) return 'below';
  if (v < EPA_GUIDELINE_PPM) return 'near';
  return 'above';
}

// Category list for modes that aren't a smooth scale; null for scale modes.
export function legendFor(mode) {
  return mode === 'trend' ? TREND_LEGEND : null;
}

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const clamp01 = (t) => Math.min(1, Math.max(0, t));

function interpolate(colors, t) {
  const pos = clamp01(t) * (colors.length - 1);
  const i = Math.min(Math.floor(pos), colors.length - 2);
  const f = pos - i;
  const [a, b] = [hex(colors[i]), hex(colors[i + 1])];
  return `#${a.map((v, k) => Math.round(v + (b[k] - v) * f).toString(16).padStart(2, '0')).join('')}`;
}

export function scaleColor(mode, value, [min, max]) {
  const scale = SCALES[mode];
  if (scale.kind === 'diverging') {
    const g = EPA_GUIDELINE_PPM;
    if (value <= g) return interpolate(BELOW, g > min ? (value - min) / (g - min) : 1);
    return interpolate(ABOVE, max > g ? (value - g) / (max - g) : 1);
  }
  return interpolate(scale.colors, (value - min) / (max - min));
}

// Color stops for drawing the thermometer bar, offsets 0..1 along [min, max].
export function gradientStops(mode, [min, max]) {
  const scale = SCALES[mode];
  const at = (v) => clamp01((v - min) / (max - min));
  if (scale.kind === 'diverging') {
    const g = EPA_GUIDELINE_PPM;
    return [
      ...BELOW.map((color, i) => ({ offset: at(min + ((g - min) * i) / (BELOW.length - 1)), color })),
      ...ABOVE.slice(1).map((color, i) => ({ offset: at(g + ((max - g) * (i + 1)) / (ABOVE.length - 1)), color })),
    ];
  }
  return scale.colors.map((color, i) => ({ offset: i / (scale.colors.length - 1), color }));
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

function siteValue(site, entries, { mode, species, period, latestYear, today }) {
  switch (mode) {
    case 'avg':
      return periodMean(speciesYears(site, species), period, latestYear)?.mean ?? null;
    case 'latest': {
      const [date, value] = latestOf(entries);
      return Number(date.slice(0, 4)) < periodStartYear(period, latestYear) ? null : value;
    }
    case 'age':
      return (today - new Date(latestOf(entries)[0])) / (365.25 * 24 * 3600 * 1000);
    default:
      throw new Error(`unknown color mode ${mode}`);
  }
}

export function colorSite(site, ctx) {
  const entries = speciesEntries(site, ctx.species);
  if (!entries.length) return { key: 'nodata', color: NODATA_COLOR };
  if (ctx.mode === 'trend') {
    const key = trendClass(speciesYears(site, ctx.species));
    return { key, color: TREND_LEGEND.find((l) => l.key === key).color };
  }
  const value = siteValue(site, entries, ctx);
  if (value === null) return { key: 'nodata', color: NODATA_COLOR };
  const rounded = Math.round(value * 10000) / 10000;
  return { key: 'value', value: rounded, color: scaleColor(ctx.mode, rounded, ctx.range ?? SCALES[ctx.mode].range) };
}
