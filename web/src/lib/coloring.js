// What a site's map dot color means, for each "Color by" mode.
import { ALL_SPECIES, EPA_GUIDELINE_PPM, NEAR_LOWER_PPM } from './config.js';
import { periodMean, periodStartYear, speciesYears, trendPercent } from './stats.js';

export const MODES = ['avg', 'latest', 'age', 'trend'];
export const MODE_LABELS = {
  avg: 'Average Mercury Over Time (ppm)',
  latest: 'Most Recent Sampling Concentration (ppm)',
  age: 'Years Since Last Mercury Sample',
  trend: 'Mercury Trend (% Change per Decade)',
};
export const MODE_SHORT = {
  avg: 'Avg Mercury Over Time', latest: 'Most Recent Sampling Concentration', age: 'Sample Age', trend: 'Trend',
};

const NODATA_COLOR = '#9e9e9e';
// ColorBrewer RdYlBu, split at the EPA guideline: blue side below it, red side above it.
const BELOW = ['#4575b4', '#91bfdb', '#e0f3f8', '#ffffbf'];
const ABOVE = ['#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026'];
// ColorBrewer RdBu ends around a neutral grey for "no change".
const FALLING = ['#2166ac', '#67a9cf', '#d9d9d9'];
const RISING = ['#d9d9d9', '#ef8a62', '#b2182b'];
const BLUES_DARK_TO_LIGHT = ['#08306b', '#2171b5', '#6baed6', '#c6dbef'];

const MERCURY_SCALE = {
  kind: 'diverging', center: EPA_GUIDELINE_PPM, centerLabel: 'EPA 0.3', below: BELOW, above: ABOVE, range: [0, 1], minBounds: [0, 0.29], maxBounds: [0.31, 3], step: 0.01,
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
  trend: {
    kind: 'diverging', center: 0, centerLabel: 'No change', below: FALLING, above: RISING,
    range: [-50, 50], minBounds: [-200, -1], maxBounds: [1, 200], step: 1,
    handles: ['Deepest blue at', 'Deepest red at'], unit: '%',
  },
};


export function mercuryBand(v) {
  if (v < NEAR_LOWER_PPM) return 'below';
  if (v < EPA_GUIDELINE_PPM) return 'near';
  return 'above';
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
    const c = scale.center;
    if (value <= c) return interpolate(scale.below, c > min ? (value - min) / (c - min) : 1);
    return interpolate(scale.above, max > c ? (value - c) / (max - c) : 1);
  }
  return interpolate(scale.colors, (value - min) / (max - min));
}

// Color stops for drawing the thermometer bar, offsets 0..1 along [min, max].
export function gradientStops(mode, [min, max]) {
  const scale = SCALES[mode];
  const at = (v) => clamp01((v - min) / (max - min));
  if (scale.kind === 'diverging') {
    const { center: c, below, above } = scale;
    return [
      ...below.map((color, i) => ({ offset: at(min + ((c - min) * i) / (below.length - 1)), color })),
      ...above.slice(1).map((color, i) => ({ offset: at(c + ((max - c) * (i + 1)) / (above.length - 1)), color })),
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
    case 'trend':
      return trendPercent(speciesYears(site, species));
    default:
      throw new Error(`unknown color mode ${mode}`);
  }
}

export function colorSite(site, ctx) {
  const entries = speciesEntries(site, ctx.species);
  if (!entries.length) return { key: 'nodata', color: NODATA_COLOR };
  const value = siteValue(site, entries, ctx);
  if (value === null) return { key: 'nodata', color: NODATA_COLOR };
  const rounded = Math.round(value * 10000) / 10000;
  return { key: 'value', value: rounded, color: scaleColor(ctx.mode, rounded, ctx.range ?? SCALES[ctx.mode].range) };
}
