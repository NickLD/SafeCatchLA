import { expect, test } from 'vitest';
import { colorSite, legendFor, MODES, mercuryBand } from '../src/lib/coloring.js';

const site = {
  last: '2016-09-14',
  species: { B: { n: 3, latest: ['2016-09-14', 0.31], years: { '1994': [1.4, 2], '2016': [0.31, 1] } } },
};
const ctx = { species: 'B', period: 'all', latestYear: 2026, today: new Date('2026-10-24') };

test('mercuryBand edges', () => {
  expect([0.19, 0.2, 0.29, 0.3].map(mercuryBand)).toEqual(['below', 'near', 'near', 'above']);
});

test('colorSite modes', () => {
  expect(colorSite(site, { ...ctx, mode: 'avg' })).toEqual({ key: 'above', color: '#d7191c' }); // (1.4+0.31)/3
  expect(colorSite(site, { ...ctx, mode: 'latest' }).key).toBe('above');
  expect(colorSite(site, { ...ctx, mode: 'age' }).key).toBe('mid'); // 10.1 years
  expect(colorSite(site, { ...ctx, mode: 'count' }).key).toBe('few');
  expect(colorSite(site, { ...ctx, mode: 'trend' }).key).toBe('insufficient');
});

test('colorSite with ALL species pools all species', () => {
  const two = { last: '2024-01-01', species: { ...site.species, C: { n: 60, latest: ['2024-01-01', 0.1], years: { '2024': [6, 60] } } } };
  expect(colorSite(two, { ...ctx, species: 'ALL', mode: 'count' }).key).toBe('many');
  expect(colorSite(two, { ...ctx, species: 'ALL', mode: 'age' }).key).toBe('recent');
  expect(colorSite(two, { ...ctx, species: 'ALL', mode: 'latest' }).key).toBe('below');
});

test('colorSite no recent data', () => {
  expect(colorSite(site, { ...ctx, period: 5, mode: 'avg' })).toEqual({ key: 'nodata', color: '#9e9e9e' });
  expect(colorSite(site, { ...ctx, period: 5, mode: 'latest' }).key).toBe('nodata');
  expect(colorSite(site, { ...ctx, species: 'OTHER', mode: 'avg' }).key).toBe('nodata');
  expect(colorSite(site, { ...ctx, species: 'OTHER', mode: 'count' }).key).toBe('nodata');
});

test('legendFor', () => {
  expect(legendFor('avg').map((l) => l.key)).toEqual(['below', 'near', 'above', 'nodata']);
  for (const m of MODES) expect(legendFor(m).length).toBeGreaterThan(2);
});
