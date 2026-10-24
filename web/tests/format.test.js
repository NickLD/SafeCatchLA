import { expect, test } from 'vitest';
import { displaySpecies, formatPpm } from '../src/lib/format.js';

test('format', () => {
  expect(displaySpecies('LARGEMOUTH BASS')).toBe('Largemouth Bass');
  expect(displaySpecies('ALL')).toBe('All species (mixed)');
  expect(formatPpm(0.5312)).toBe('0.53');
  expect(formatPpm(0)).toBe('0.00');
});
