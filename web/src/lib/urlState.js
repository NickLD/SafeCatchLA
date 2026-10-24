// Shareable app state in location.hash, e.g. #site=0436&species=LARGEMOUTH%20BASS
import { ALL_SPECIES, DEFAULT_PERIOD, PERIODS } from './config.js';
import { MODES } from './coloring.js';

export const DEFAULTS = { site: null, species: null, filter: ALL_SPECIES, period: DEFAULT_PERIOD, color: 'avg', compare: null };

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
  const color = params.get('color');
  if (MODES.includes(color)) state.color = color;
  return state;
}

export function toHash(state) {
  const parts = [];
  for (const key of Object.keys(DEFAULTS)) {
    const v = state[key];
    if (v !== null && v !== undefined && v !== DEFAULTS[key]) {
      parts.push(`${key}=${encodeURIComponent(v)}`);
    }
  }
  return parts.length ? `#${parts.join('&')}` : '';
}
