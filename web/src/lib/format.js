import { ALL_SPECIES } from './config.js';

export function displaySpecies(name) {
  if (name === ALL_SPECIES) return 'All species (mixed)';
  return name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatPpm(v) {
  return v.toFixed(2);
}

// 'YYYY-MM-DD' dates are calendar days; full ISO timestamps are shown in the viewer's local time.
export function formatDate(s) {
  const d = s.length === 10 ? new Date(`${s}T00:00:00`) : new Date(s);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
