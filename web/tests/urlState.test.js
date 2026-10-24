import { expect, test } from 'vitest';
import { DEFAULTS, parseHash, toHash } from '../src/lib/urlState.js';

test('parseHash valid', () => {
  expect(parseHash('#site=0436&species=LARGEMOUTH%20BASS&period=all&color=age&filter=BOWFIN'))
    .toEqual({ site: '0436', species: 'LARGEMOUTH BASS', filter: 'BOWFIN', period: 'all', color: 'age', compare: null });
  expect(parseHash('#period=5').period).toBe(5);
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
