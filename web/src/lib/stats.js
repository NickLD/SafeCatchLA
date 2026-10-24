// Pure statistics over per-year [sum, count] pairs from sites.json.
import { ALL_SPECIES } from './config.js';

const TREND_MIN_YEARS = 3;
const TREND_MIN_SPAN = 5;

export function periodStartYear(period, latestYear) {
  return period === 'all' ? -Infinity : latestYear - period + 1;
}

export function periodMean(years, period, latestYear) {
  if (!years) return null;
  const start = periodStartYear(period, latestYear);
  let sum = 0;
  let n = 0;
  for (const [y, [s, c]] of Object.entries(years)) {
    if (Number(y) >= start) {
      sum += s;
      n += c;
    }
  }
  return n ? { mean: sum / n, n } : null;
}

export function yearlyMeans(years) {
  return Object.entries(years ?? {})
    .map(([y, [s, c]]) => ({ year: Number(y), mean: s / c, n: c }))
    .sort((a, b) => a.year - b.year);
}

// Rate of change in mercury, as a whole-number percent per decade (least-squares slope of yearly means,
// relative to their average). Null when there are too few years to say.
export function trendPercent(years) {
  const pts = yearlyMeans(years);
  if (pts.length < TREND_MIN_YEARS || pts.at(-1).year - pts[0].year < TREND_MIN_SPAN) return null;
  const xm = pts.reduce((a, p) => a + p.year, 0) / pts.length;
  const ym = pts.reduce((a, p) => a + p.mean, 0) / pts.length;
  if (ym === 0) return 0;
  let num = 0;
  let den = 0;
  for (const p of pts) {
    num += (p.year - xm) * (p.mean - ym);
    den += (p.year - xm) ** 2;
  }
  return Math.round(((num / den) * 10 * 100) / ym) || 0;
}

function pooledMean(pts) {
  const n = pts.reduce((a, p) => a + p.n, 0);
  return pts.reduce((a, p) => a + p.mean * p.n, 0) / n;
}

// Percent change in mercury. 'period': earliest vs latest sampled years inside the selected period
// (up to 3 years each side); 'previous': the last sampled year vs the one before it.
export function changeOver(years, period, latestYear, basis) {
  let pts = yearlyMeans(years);
  let k = 1;
  if (basis === 'period') {
    const start = periodStartYear(period, latestYear);
    pts = pts.filter((p) => p.year >= start);
    k = Math.min(3, Math.floor(pts.length / 2));
  } else {
    pts = pts.slice(-2);
  }
  if (pts.length < 2) return null;
  const earlyPts = pts.slice(0, k);
  const latePts = pts.slice(-k);
  const early = pooledMean(earlyPts);
  if (early === 0) return null;
  return {
    pct: Math.round(((pooledMean(latePts) - early) / early) * 100),
    early: [earlyPts[0].year, earlyPts.at(-1).year],
    late: [latePts[0].year, latePts.at(-1).year],
  };
}

export function mixedYears(site) {
  const out = {};
  for (const sp of Object.values(site.species)) {
    for (const [y, [s, c]] of Object.entries(sp.years)) {
      const t = (out[y] ??= [0, 0]);
      t[0] += s;
      t[1] += c;
    }
  }
  return out;
}

export function speciesYears(site, species) {
  if (species === ALL_SPECIES) return mixedYears(site);
  return site.species[species]?.years ?? null;
}

export function groupMean(sites, species, period, latestYear, predicate = () => true) {
  const means = [];
  for (const site of sites) {
    if (!predicate(site)) continue;
    const m = periodMean(speciesYears(site, species), period, latestYear);
    if (m) means.push(m.mean);
  }
  return means.length ? { mean: means.reduce((a, b) => a + b, 0) / means.length, nSites: means.length } : null;
}
