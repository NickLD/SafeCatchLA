import { ALL_SPECIES } from './config.js';

export function displaySpecies(name) {
  if (name === ALL_SPECIES) return 'All species (mixed)';
  return name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatPpm(v) {
  return v.toFixed(2);
}
