import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { filterLabel, GROUPS, groupSpecies } from '../src/lib/speciesGroups.js';

const ALL_NAMES = Object.keys(
  JSON.parse(readFileSync('public/data/sites.json', 'utf8')).sites
    .reduce((acc, s) => Object.assign(acc, s.species), {}),
);

test('every species in the data belongs to exactly one group', () => {
  for (const name of ALL_NAMES) {
    expect(GROUPS.filter((g) => g.members.includes(name)), name).toHaveLength(1);
  }
});

test('groupSpecies keeps only available species, in the given order, and drops empty groups', () => {
  const groups = groupSpecies(['BLUEGILL', 'LARGEMOUTH BASS', 'SPOTTED BASS']);
  expect(groups.map((g) => [g.label, g.species])).toEqual([
    ['Bass', ['LARGEMOUTH BASS', 'SPOTTED BASS']],
    ['Sunfish (bream)', ['BLUEGILL']],
  ]);
});

test('filterLabel', () => {
  const avail = ['LARGEMOUTH BASS', 'SPOTTED BASS', 'BLUEGILL'];
  expect(filterLabel([], avail)).toBe('All species');
  expect(filterLabel(['BLUEGILL'], avail)).toBe('Bluegill');
  expect(filterLabel(['LARGEMOUTH BASS', 'SPOTTED BASS'], avail)).toBe('Bass (2)');
  expect(filterLabel(['LARGEMOUTH BASS', 'BLUEGILL'], avail)).toBe('2 species');
});
