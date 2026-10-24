import { expect, test } from 'vitest';
import { DEFAULTS, parseHash, sanitizeState, toHash } from '../src/lib/urlState.js';

test('parseHash valid', () => {
  expect(parseHash('#site=0436&species=LARGEMOUTH%20BASS&period=all&color=age&filter=BOWFIN'))
    .toEqual({ site: '0436', species: 'LARGEMOUTH BASS', filter: 'BOWFIN', period: 'all', color: 'age', compare: null, range: null });
  expect(parseHash('#period=5').period).toBe(5);
  expect(parseHash('#color=count').color).toBe('avg'); // removed modes in old links
  expect(parseHash('#color=latest').color).toBe('avg');
});

test('parseHash ignores bad values', () => {
  expect(parseHash('#period=7&color=rainbow&junk')).toEqual(DEFAULTS);
  expect(parseHash('')).toEqual(DEFAULTS);
  expect(parseHash('#%E0%A4%A')).toEqual(DEFAULTS);
});

test('toHash round trip and omits defaults', () => {
  const s = { ...DEFAULTS, site: '0436', species: 'LARGEMOUTH BASS', period: 'all', compare: 'BOWFIN' };
  expect(parseHash(toHash(s))).toEqual(s);
  expect(toHash(DEFAULTS)).toBe('');
});

const SITES = [
  { id: '0436', species: { 'LARGEMOUTH BASS': { n: 9 }, BOWFIN: { n: 2 } } },
  { id: '0001', species: { 'BLUE CATFISH': { n: 1 } } },
];

test('sanitizeState drops values the data does not have', () => {
  const base = { ...DEFAULTS, site: '0436', species: 'LARGEMOUTH BASS' };
  expect(sanitizeState(base, SITES)).toEqual({});
  expect(sanitizeState({ ...base, species: 'NOT A FISH' }, SITES)).toEqual({ species: 'LARGEMOUTH BASS' });
  expect(sanitizeState({ ...base, compare: 'BLUE CATFISH' }, SITES)).toEqual({ compare: null });
  expect(sanitizeState({ ...base, compare: 'ALL' }, SITES)).toEqual({});
  expect(sanitizeState({ ...base, filter: 'FOO' }, SITES)).toEqual({ filter: 'ALL' });
  expect(sanitizeState({ ...base, filter: 'BLUE CATFISH' }, SITES)).toEqual({});
  expect(sanitizeState({ ...base, site: 'nope' }, SITES)).toEqual({ site: null, species: null, compare: null });
  expect(sanitizeState({ ...DEFAULTS, site: '0436' }, SITES)).toEqual({ species: 'LARGEMOUTH BASS' });
});

test('range round-trips and bad ranges are ignored', () => {
  expect(parseHash('#range=0.1,0.8').range).toEqual([0.1, 0.8]);
  expect(parseHash('#range=0.8,0.1').range).toBeNull();
  expect(parseHash('#range=x,1').range).toBeNull();
  const s = { ...DEFAULTS, range: [0.1, 0.8] };
  expect(parseHash(toHash(s))).toEqual(s);
});
