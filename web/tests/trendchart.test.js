import { fireEvent, render, screen } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import TrendChart from '../src/components/TrendChart.svelte';

const CUTS = [33.02, 39.37];
const SAMPLES = [
  { date: '1994-08-12', value: 0.2, nd: false, weightG: 300, lengthCm: 30, nFish: 5, composite: true },
  { date: '1994-09-01', value: 0.6, nd: false, weightG: 900, lengthCm: 45, nFish: 1, composite: false },
  { date: '2016-05-01', value: 0.3, nd: false, weightG: 500, lengthCm: 36, nFish: 3, composite: true },
];
const YEARS = { '1994': [0.8, 2], '2016': [0.3, 1] };

test('tapping a sample shows its size and weight', async () => {
  render(TrendChart, { years: YEARS, samples: SAMPLES, cuts: CUTS });
  await fireEvent.click(screen.getByRole('button', { name: /Sep 1, 1994/ }));
  expect(screen.getByRole('status').textContent).toContain('Sep 1, 1994 · 0.60 ppm · 17.7 in, 2.0 lb · single fish');
});

test('size chips filter the samples and the yearly line', async () => {
  render(TrendChart, { years: YEARS, samples: SAMPLES, cuts: CUTS });
  expect(screen.getAllByRole('button', { name: /ppm ·/ })).toHaveLength(3);
  expect(screen.getByRole('button', { name: '1994: 0.40 ppm' })).toBeTruthy();
  await fireEvent.click(screen.getByRole('button', { name: 'Large (15.5"+)' }));
  expect(screen.getAllByRole('button', { name: /ppm ·/ })).toHaveLength(2);
  expect(screen.getByRole('button', { name: '1994: 0.20 ppm' })).toBeTruthy();
});

test('without size cutoffs there are no chips and the line uses the yearly data', () => {
  render(TrendChart, { years: YEARS, samples: [], cuts: undefined });
  expect(screen.queryByRole('button', { name: /Small/ })).toBeNull();
  expect(screen.getByRole('button', { name: '1994: 0.40 ppm' })).toBeTruthy();
});
