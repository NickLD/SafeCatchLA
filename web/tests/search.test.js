import { expect, test } from 'vitest';
import { searchSites } from '../src/lib/search.js';

const sites = [
  { id: '1', name: 'Vermilion River North of Perry', address: '2.1 miles south of Abbeville' },
  { id: '2', name: 'Abbeville Canal', address: '' },
];

test('searchSites ranks name matches before address matches', () => {
  expect(searchSites(sites, 'abbeville').map((s) => s.id)).toEqual(['2', '1']);
});

test('searchSites ignores short queries and respects limit', () => {
  expect(searchSites(sites, ' a')).toEqual([]);
  expect(searchSites(sites, 'ab', 1).map((s) => s.id)).toEqual(['2']);
});
