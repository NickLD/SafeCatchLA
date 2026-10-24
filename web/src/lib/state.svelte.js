// App-wide state, mirrored into location.hash so any view can be shared as a link.
import { periodMean } from './stats.js';
import { DEFAULTS, parseHash, toHash } from './urlState.js';

export const app = $state({ ...DEFAULTS, sites: [], latestYear: null, sizeClasses: {}, meta: null, national: null });

export function initFromHash() {
  Object.assign(app, parseHash(location.hash));
  addEventListener('hashchange', () => Object.assign(app, parseHash(location.hash)));
}

export function update(patch) {
  Object.assign(app, patch);
  const hash = toHash(app);
  history.replaceState(null, '', hash || location.pathname + location.search);
}

export function selectedSite() {
  return app.site ? (app.sites.find((s) => s.id === app.site) ?? null) : null;
}

// Species with the most samples at a site, for when a site is opened without one chosen.
export function defaultSpecies(site) {
  return Object.entries(site.species).sort((a, b) => b[1].n - a[1].n)[0]?.[0] ?? null;
}

// Species in the dataset with samples in the period (all species by default), most-sampled first.
export function speciesBySampleCount(sites, period = 'all', latestYear = null) {
  const totals = new Map();
  for (const s of sites) {
    for (const [name, sp] of Object.entries(s.species)) {
      if (period !== 'all' && !periodMean(sp.years, period, latestYear)) continue;
      totals.set(name, (totals.get(name) ?? 0) + sp.n);
    }
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
}
