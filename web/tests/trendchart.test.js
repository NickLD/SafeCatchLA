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
  expect(screen.getByRole('status').textContent).toContain('Sep 1, 1994 · 0.60 ppm · 17.72 in, 1.98 lb · single fish');
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

test('marks where the selected period starts', () => {
  const years = { '1994': [0.8, 2], '2016': [0.3, 1], '2022': [0.2, 1] };
  render(TrendChart, { years, samples: [], cuts: undefined, period: 10, latestYear: 2026 });
  expect(screen.getByText('Last 10 yrs →')).toBeTruthy();
});

test('no period marker for all years, or when the whole history is inside the period', () => {
  const years = { '1994': [0.8, 2], '2016': [0.3, 1] };
  render(TrendChart, { years, samples: [], cuts: undefined, period: 'all', latestYear: 2026 });
  expect(screen.queryByText(/yrs →/)).toBeNull();
  render(TrendChart, { years: { '2020': [0.3, 1], '2024': [0.2, 1] }, samples: [], period: 10, latestYear: 2026 });
  expect(screen.queryByText(/yrs →/)).toBeNull();
});

test('tapping the yearly point of a single-sample year shows that sample and its size', async () => {
  const one = [{ date: '2016-05-01', value: 0.3, nd: false, weightG: 500, lengthCm: 36, nFish: 3, composite: true }];
  render(TrendChart, { years: { '2016': [0.3, 1] }, samples: one, cuts: CUTS });
  await fireEvent.click(screen.getByRole('button', { name: '2016: 0.30 ppm' }));
  const status = screen.getByRole('status').textContent;
  expect(status).toContain('May 1, 2016 · 0.30 ppm · 14.17 in, 1.10 lb · average of 3 fish');
  expect(status).toContain('Medium (13.0–15.5")');
  expect(status).toContain('1 sample');
});

test('sample dots are drawn above the yearly points so they can be tapped', () => {
  const { container } = render(TrendChart, { years: YEARS, samples: SAMPLES, cuts: CUTS });
  const circles = [...container.querySelectorAll('circle')];
  const lastYearPoint = circles.map((c) => c.classList.contains('pt')).lastIndexOf(true);
  const firstSample = circles.findIndex((c) => c.classList.contains('sample'));
  expect(firstSample).toBeGreaterThan(lastYearPoint);
});

test('yearly average is a pill that shows and hides the average line', async () => {
  render(TrendChart, { years: YEARS, samples: SAMPLES, cuts: CUTS });
  const pill = screen.getByRole('button', { name: 'Yearly average' });
  expect(pill.getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('button', { name: '1994: 0.40 ppm' })).toBeTruthy();
  await fireEvent.click(pill);
  expect(pill.getAttribute('aria-pressed')).toBe('false');
  expect(screen.queryByRole('button', { name: /^1994: / })).toBeNull();
  expect(screen.getAllByRole('button', { name: /ppm ·/ })).toHaveLength(3); // samples stay
});
