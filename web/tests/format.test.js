import { expect, test } from 'vitest';
import { displaySpecies, formatDate, formatPpm } from '../src/lib/format.js';

test('format', () => {
  expect(displaySpecies('LARGEMOUTH BASS')).toBe('Largemouth Bass');
  expect(displaySpecies('ALL')).toBe('All species (mixed)');
  expect(formatPpm(0.5312)).toBe('0.53');
  expect(formatPpm(0)).toBe('0.00');
});

test('formatDate', () => {
  expect(formatDate('2026-10-24')).toBe('Oct 24, 2026');
  expect(formatDate('2026-10-31T11:02:00Z')).toBe('Oct 31, 2026');
});
