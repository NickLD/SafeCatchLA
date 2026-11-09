import { expect, test } from 'vitest';
import { LAKES, lakeAsSite, lakeForSite, mergeDetails } from '../src/lib/lakes.js';
import { parseHash, sanitizeState, toHash } from '../src/lib/urlState.js';

const site = (id, species, last = '2020-01-01') => ({ id, name: id, basin: '12', lat: 30, lon: -91, n: 2, last, species });
const SITES = [
  site('0335', { BASS: { n: 2, latest: ['2023-04-25', 0.4, 1, 1], years: { 2020: [0.6, 1, 2], 2023: [0.4, 1] } } }, '2023-04-25'),
  site('0536', { BASS: { n: 2, latest: ['2023-04-25', 0.2, 3, 5], years: { 2020: [0.2, 1], 2023: [0.6, 3, 5] } }, BOWFIN: { n: 1, latest: ['2020-03-03', 0.9], years: { 2020: [0.9, 1] } } }),
];

test('every site belongs to at most one lake', () => {
  const ids = LAKES.flatMap((l) => l.sites);
  expect(new Set(ids).size).toBe(ids.length);
  expect(LAKES).toHaveLength(35);
  expect(lakeForSite('0335').name).toBe('False River');
  expect(lakeForSite('9999')).toBeNull();
});

test('pools samples by year and species across the lake', () => {
  const lake = lakeAsSite('false-river', SITES);
  expect(lake.members).toHaveLength(2);
  expect(lake.n).toBe(4);
  expect(lake.last).toBe('2023-04-25');
  expect(lake.species.BASS.n).toBe(4);
  expect(lake.species.BASS.years).toEqual({ 2020: [0.8, 2, 3], 2023: [1, 4, 6] });
  expect(lake.species.BOWFIN.latest).toEqual(['2020-03-03', 0.9]);
});

test('same-day latest readings are weighted by sample count', () => {
  const [date, value, samples, fish] = lakeAsSite('false-river', SITES).species.BASS.latest;
  expect(date).toBe('2023-04-25');
  expect(value).toBeCloseTo(0.25);
  expect([samples, fish]).toEqual([4, 6]);
});

test('a lake needs at least two of its sites in the data', () => {
  expect(lakeAsSite('false-river', SITES.slice(0, 1))).toBeNull();
  expect(lakeAsSite('nowhere', SITES)).toBeNull();
});

test('merged sample files stay in date order', () => {
  const out = mergeDetails('x', [{ species: { BASS: [{ date: '2021-01-01' }] } }, { species: { BASS: [{ date: '2019-01-01' }] } }]);
  expect(out.species.BASS.map((s) => s.date)).toEqual(['2019-01-01', '2021-01-01']);
});

test('lake survives the URL and unknown lakes are dropped', () => {
  expect(parseHash(toHash({ ...parseHash(''), lake: 'false-river' })).lake).toBe('false-river');
  expect(sanitizeState({ ...parseHash(''), lake: 'nowhere' }, SITES).lake).toBeNull();
  expect(sanitizeState({ ...parseHash(''), lake: 'false-river', species: 'BASS' }, SITES)).toEqual({});
});

test('an All species link is kept', () => {
  expect(sanitizeState({ ...parseHash(''), lake: 'false-river', species: 'ALL' }, SITES)).toEqual({});
});
