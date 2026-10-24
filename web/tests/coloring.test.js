import { expect, test } from 'vitest';
import { colorSite, gradientStops, legendFor, mercuryBand, scaleColor, SCALES } from '../src/lib/coloring.js';

const site = {
  last: '2016-09-14',
  species: { B: { n: 3, latest: ['2016-09-14', 0.31, 1], years: { '1994': [1.4, 2], '2016': [0.31, 1] } } },
};
const ctx = { species: 'B', period: 'all', latestYear: 2026, today: new Date('2026-10-24'), range: null };

test('mercuryBand edges', () => {
  expect([0.19, 0.2, 0.29, 0.3].map(mercuryBand)).toEqual(['below', 'near', 'near', 'above']);
});

test('mercury scale is pinned at the EPA guideline', () => {
  expect(scaleColor('avg', 0.3, [0, 1])).toBe('#ffffbf');
  expect(scaleColor('avg', 0, [0, 1])).toBe('#4575b4');
  expect(scaleColor('avg', 1, [0, 1])).toBe('#a50026');
  expect(scaleColor('avg', 0.15, [0, 1])).toBe('#b9d9ea'); // halfway along the blue side
  expect(scaleColor('latest', 0.3, [0.2, 0.5])).toBe('#ffffbf');
});

test('values past the range get the end colors', () => {
  expect(scaleColor('avg', 2, [0, 1])).toBe('#a50026');
  expect(scaleColor('avg', 0.05, [0.1, 1])).toBe('#4575b4');
  expect(scaleColor('avg', 0.6, [0, 0.6])).toBe('#a50026');
});

test('age scale: recent is dark, old is light', () => {
  expect(scaleColor('age', 0, [0, 30])).toBe('#08306b');
  expect(scaleColor('age', 30, [0, 30])).toBe('#c6dbef');
  expect(scaleColor('age', 45, [0, 30])).toBe('#c6dbef');
});

test('count scale: few is light, many is dark', () => {
  expect(scaleColor('count', 1, [1, 50])).toBe('#c6dbef');
  expect(scaleColor('count', 50, [1, 50])).toBe('#08306b');
  expect(scaleColor('count', 300, [1, 50])).toBe('#08306b');
});

test('colorSite uses the smooth scales with the default range', () => {
  const avg = colorSite(site, { ...ctx, mode: 'avg' }); // (1.4 + 0.31) / 3 = 0.57
  expect(avg).toEqual({ key: 'value', value: 0.57, color: scaleColor('avg', 0.57, SCALES.avg.range) });
  expect(colorSite(site, { ...ctx, mode: 'latest' }).value).toBe(0.31);
  expect(colorSite(site, { ...ctx, mode: 'age' }).value).toBeCloseTo(10.11, 1);
  expect(colorSite(site, { ...ctx, mode: 'count' }).value).toBe(3);
  expect(colorSite(site, { ...ctx, mode: 'trend' }).key).toBe('insufficient');
});

test('colorSite respects a custom range', () => {
  expect(colorSite(site, { ...ctx, mode: 'avg', range: [0, 0.5] }).color).toBe('#a50026');
});

test('colorSite with ALL species pools all species', () => {
  const two = { last: '2024-01-01', species: { ...site.species, C: { n: 60, latest: ['2024-01-01', 0.1, 1], years: { '2024': [6, 60] } } } };
  expect(colorSite(two, { ...ctx, species: 'ALL', mode: 'count' }).value).toBe(63);
  expect(colorSite(two, { ...ctx, species: 'ALL', mode: 'latest' }).value).toBe(0.1);
});

test('colorSite no recent data', () => {
  expect(colorSite(site, { ...ctx, period: 5, mode: 'avg' })).toEqual({ key: 'nodata', color: '#9e9e9e' });
  expect(colorSite(site, { ...ctx, period: 5, mode: 'latest' }).key).toBe('nodata');
  expect(colorSite(site, { ...ctx, species: 'OTHER', mode: 'avg' }).key).toBe('nodata');
  expect(colorSite(site, { ...ctx, species: 'OTHER', mode: 'count' }).key).toBe('nodata');
});

test('legendFor lists categories for trend only', () => {
  expect(legendFor('trend').map((l) => l.key)).toEqual(['improving', 'flat', 'worsening', 'insufficient']);
  expect(legendFor('avg')).toBeNull();
});

test('gradientStops puts the guideline at its position in the bar', () => {
  const stops = gradientStops('avg', [0, 1]);
  expect(stops[0]).toEqual({ offset: 0, color: '#4575b4' });
  expect(stops.find((s) => s.color === '#ffffbf').offset).toBeCloseTo(0.3);
  expect(stops.at(-1)).toEqual({ offset: 1, color: '#a50026' });
});
