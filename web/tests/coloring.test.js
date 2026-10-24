import { expect, test } from 'vitest';
import { colorSite, gradientStops, MODE_LABELS, MODE_SHORT, MODES, mercuryBand, scaleColor, SCALES } from '../src/lib/coloring.js';

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

test('color modes and their names', () => {
  expect(MODES).toEqual(['avg', 'latest', 'age', 'trend']);
  expect(MODE_SHORT).toEqual({
    avg: 'Avg Mercury Over Time', latest: 'Most Recent Sampling Concentration', age: 'Sample Age', trend: 'Trend',
  });
  expect(MODE_LABELS).toEqual({
    avg: 'Average Mercury Over Time (ppm)',
    latest: 'Most Recent Sampling Concentration (ppm)',
    age: 'Years Since Last Mercury Sample',
    trend: 'Mercury Trend (% Change per Decade)',
  });
});

test('colorSite uses the smooth scales with the default range', () => {
  const avg = colorSite(site, { ...ctx, mode: 'avg' }); // (1.4 + 0.31) / 3 = 0.57
  expect(avg).toEqual({ key: 'value', value: 0.57, color: scaleColor('avg', 0.57, SCALES.avg.range) });
  expect(colorSite(site, { ...ctx, mode: 'latest' }).value).toBe(0.31);
  expect(colorSite(site, { ...ctx, mode: 'age' }).value).toBeCloseTo(10.11, 1);
  expect(colorSite(site, { ...ctx, mode: 'trend' }).key).toBe('nodata'); // only 2 years
});

test('colorSite respects a custom range', () => {
  expect(colorSite(site, { ...ctx, mode: 'avg', range: [0, 0.5] }).color).toBe('#a50026');
});

test('colorSite with ALL species pools all species', () => {
  const two = { last: '2024-01-01', species: { ...site.species, C: { n: 60, latest: ['2024-01-01', 0.1, 1], years: { '2024': [6, 60] } } } };
  expect(colorSite(two, { ...ctx, species: 'ALL', mode: 'age' }).value).toBeCloseTo(2.8, 1);
  expect(colorSite(two, { ...ctx, species: 'ALL', mode: 'latest' }).value).toBe(0.1);
});

test('colorSite no recent data', () => {
  expect(colorSite(site, { ...ctx, period: 5, mode: 'avg' })).toEqual({ key: 'nodata', color: '#9e9e9e' });
  expect(colorSite(site, { ...ctx, period: 5, mode: 'latest' }).key).toBe('nodata');
  expect(colorSite(site, { ...ctx, species: 'OTHER', mode: 'avg' }).key).toBe('nodata');
  expect(colorSite(site, { ...ctx, species: 'OTHER', mode: 'age' }).key).toBe('nodata');
});

test('trend scale: grey is no change, blue improving, red worsening', () => {
  expect(scaleColor('trend', 0, [-50, 50])).toBe('#d9d9d9');
  expect(scaleColor('trend', -50, [-50, 50])).toBe('#2166ac');
  expect(scaleColor('trend', -25, [-50, 50])).toBe('#67a9cf');
  expect(scaleColor('trend', 50, [-50, 50])).toBe('#b2182b');
  expect(scaleColor('trend', 120, [-50, 50])).toBe('#b2182b');
});

test('colorSite trend uses percent change per decade', () => {
  const s = { last: '2020-01-01', species: { B: { n: 3, latest: ['2020-01-01', 0.3, 1], years: { '2000': [0.5, 1], '2010': [0.4, 1], '2020': [0.3, 1] } } } };
  expect(colorSite(s, { ...ctx, mode: 'trend' })).toEqual({ key: 'value', value: -25, color: '#67a9cf' });
});

test('gradientStops for trend puts no-change at its position', () => {
  const stops = gradientStops('trend', [-50, 50]);
  expect(stops.find((x) => x.color === '#d9d9d9').offset).toBeCloseTo(0.5);
});

test('gradientStops puts the guideline at its position in the bar', () => {
  const stops = gradientStops('avg', [0, 1]);
  expect(stops[0]).toEqual({ offset: 0, color: '#4575b4' });
  expect(stops.find((s) => s.color === '#ffffbf').offset).toBeCloseTo(0.3);
  expect(stops.at(-1)).toEqual({ offset: 1, color: '#a50026' });
});
