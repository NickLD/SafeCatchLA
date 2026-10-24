import { expect, test } from 'vitest';
import {
  changeOver, groupMean, mixedYears, periodMean, speciesYears, trendPercent, yearlyMeans,
} from '../src/lib/stats.js';

const Y = { '1994': [1.4, 2], '2000': [0.6, 2], '2016': [0.3, 1] };

test('periodMean', () => {
  expect(periodMean(Y, 10, 2026)).toBeNull();
  expect(periodMean(Y, 20, 2026)).toEqual({ mean: 0.3, n: 1 });
  const all = periodMean(Y, 'all', 2026);
  expect(all.mean).toBeCloseTo(0.46);
  expect(all.n).toBe(5);
});

test('periodMean includes the boundary year', () => {
  expect(periodMean({ '2017': [0.5, 1] }, 10, 2026)).toEqual({ mean: 0.5, n: 1 });
  expect(periodMean({ '2016': [0.5, 1] }, 10, 2026)).toBeNull();
});

test('periodMean single sample', () => {
  expect(periodMean({ '2020': [0, 1] }, 10, 2026)).toEqual({ mean: 0, n: 1 });
});

test('yearlyMeans sorted by year', () => {
  expect(yearlyMeans({ '2000': [0.6, 2], '1994': [1.4, 2] })).toEqual([
    { year: 1994, mean: 0.7, n: 2 }, { year: 2000, mean: 0.3, n: 2 },
  ]);
});

test('trendPercent', () => {
  expect(trendPercent(Y)).toBe(-33); // about -33% per decade
  expect(trendPercent({ '2000': [0.5, 1], '2010': [0.5, 1], '2020': [0.5, 1] })).toBe(0);
  expect(trendPercent({ '2000': [0.2, 1], '2010': [0.4, 1], '2020': [0.6, 1] })).toBe(50);
  expect(trendPercent({ '2000': [0.5, 1], '2020': [0.1, 1] })).toBeNull();
  expect(trendPercent({ '2018': [0.5, 1], '2019': [0.4, 1], '2020': [0.3, 1] })).toBeNull();
  expect(trendPercent({ '2000': [0, 1], '2010': [0, 1], '2020': [0, 1] })).toBe(0);
});

test('groupMean skips sites without period data', () => {
  const sites = [
    { basin: '05', species: { B: { years: { '2020': [0.4, 2] } } } },
    { basin: '05', species: { B: { years: { '2024': [0.6, 1] } } } },
    { basin: '01', species: { B: { years: { '1999': [9, 1] } } } },
    { basin: '01', species: {} },
  ];
  const g = groupMean(sites, 'B', 10, 2026);
  expect(g.mean).toBeCloseTo(0.4);
  expect(g.nSites).toBe(2);
  expect(groupMean(sites, 'B', 10, 2026, (s) => s.basin === '01')).toBeNull();
});

test('mixedYears pools species', () => {
  expect(mixedYears({ species: { A: { years: { '2020': [1, 2] } }, B: { years: { '2020': [0.5, 1] } } } }))
    .toEqual({ '2020': [1.5, 3] });
});

test('speciesYears', () => {
  const site = { species: { A: { years: { '2020': [1, 2] } } } };
  expect(speciesYears(site, 'A')).toEqual({ '2020': [1, 2] });
  expect(speciesYears(site, 'ALL')).toEqual({ '2020': [1, 2] });
  expect(speciesYears(site, 'Z')).toBeNull();
});

const H = { '1994': [0.8, 1], '1995': [0.6, 1], '2008': [0.5, 2], '2016': [0.3, 1], '2018': [0.2, 1] };

test('changeOver period compares early vs late years inside the period', () => {
  expect(changeOver(H, 'all', 2026, 'period')).toEqual({ pct: -64, early: [1994, 1995], late: [2016, 2018] });
  expect(changeOver(H, 20, 2026, 'period')).toEqual({ pct: -20, early: [2008, 2008], late: [2018, 2018] });
  expect(changeOver(H, 10, 2026, 'period')).toBeNull(); // 2017+ has only 2018
  expect(changeOver(H, 5, 2026, 'period')).toBeNull(); // only one sampled year
});

test('changeOver previous compares the last two sampled years, ignoring the period', () => {
  expect(changeOver(H, 5, 2026, 'previous')).toEqual({ pct: -33, early: [2016, 2016], late: [2018, 2018] });
  expect(changeOver({ '2018': [0.2, 1] }, 'all', 2026, 'previous')).toBeNull();
  expect(changeOver({ '2016': [0, 1], '2018': [0.2, 1] }, 'all', 2026, 'previous')).toBeNull();
});
