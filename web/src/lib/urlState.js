// Shareable app state in location.hash, e.g. #site=0436&species=LARGEMOUTH%20BASS
import { ALL_SPECIES, DEFAULT_PERIOD, PERIODS } from './config.js';
import { MODES } from './coloring.js';

export const DEFAULTS = { site: null, species: null, filter: ALL_SPECIES, period: DEFAULT_PERIOD, color: 'avg', compare: null, range: null };

function parsePeriod(v) {
  const p = v === 'all' ? 'all' : Number(v);
  return PERIODS.includes(p) ? p : undefined;
}

export function parseHash(hash) {
  const state = { ...DEFAULTS };
  let params;
  try {
    params = new URLSearchParams(hash.replace(/^#/, ''));
  } catch {
    return state;
  }
  for (const key of ['site', 'species', 'filter', 'compare']) {
    const v = params.get(key);
    if (v) state[key] = v;
  }
  state.period = parsePeriod(params.get('period')) ?? DEFAULTS.period;
  const range = (params.get('range') ?? '').split(',').map(Number);
  if (range.length === 2 && range.every(Number.isFinite) && range[0] < range[1]) state.range = range;
  const color = params.get('color');
  if (MODES.includes(color)) state.color = color;
  return state;
}

// Shared links can outlive the data (or be hand-edited): drop values the loaded sites don't have.
export function sanitizeState(state, sites) {
  const patch = {};
  const site = state.site ? sites.find((s) => s.id === state.site) : null;
  if (state.site && !site) Object.assign(patch, { site: null, species: null, compare: null });
  if (site) {
    if (!site.species[state.species]) {
      patch.species = Object.entries(site.species).sort((a, b) => b[1].n - a[1].n)[0]?.[0] ?? null;
    }
    if (state.compare && state.compare !== ALL_SPECIES && !site.species[state.compare]) patch.compare = null;
  }
  if (state.filter !== ALL_SPECIES && !sites.some((s) => s.species[state.filter])) patch.filter = ALL_SPECIES;
  return patch;
}

export function toHash(state) {
  const parts = [];
  for (const key of Object.keys(DEFAULTS)) {
    const v = state[key];
    if (v !== null && v !== undefined && v !== DEFAULTS[key]) {
      parts.push(`${key}=${encodeURIComponent(Array.isArray(v) ? v.join(',') : v)}`);
    }
  }
  return parts.length ? `#${parts.join('&')}` : '';
}
