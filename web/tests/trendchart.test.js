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
  // 1994 is down to one sample, so its average bar gives way to that sample's dot.
  expect(screen.queryByRole('button', { name: /^1994: / })).toBeNull();
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

test('a single-sample year has no average bar; tapping its sample says it is the only one', async () => {
  const one = [{ date: '2016-05-01', value: 0.3, nd: false, weightG: 500, lengthCm: 36, nFish: 3, composite: true }];
  render(TrendChart, { years: { '2016': [0.3, 1] }, samples: one, cuts: CUTS });
  expect(screen.queryByRole('button', { name: /^2016: / })).toBeNull();
  await fireEvent.click(screen.getByRole('button', { name: /May 1, 2016/ }));
  const status = screen.getByRole('status').textContent;
  expect(status).toContain('May 1, 2016 · 0.30 ppm · 14.17 in, 1.10 lb · average of 3 fish');
  expect(status).toContain('Medium (13.0–15.5")');
  expect(status).toContain('the only sample that year');
});

test('sample dots are drawn above the yearly bars so they can be tapped', () => {
  const { container } = render(TrendChart, { years: YEARS, samples: SAMPLES, cuts: CUTS });
  const marks = [...container.querySelectorAll('.pt, .hit, .sample')];
  const lastYearPoint = marks.map((c) => !c.classList.contains('sample')).lastIndexOf(true);
  const firstSample = marks.findIndex((c) => c.classList.contains('sample'));
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

test('tapping a yearly average shows sampling dates and total fish', async () => {
  render(TrendChart, { years: YEARS, samples: SAMPLES, cuts: CUTS });
  await fireEvent.click(screen.getByRole('button', { name: '1994: 0.40 ppm' }));
  const status = screen.getByRole('status').textContent.replace(/\s+/g, ' ');
  expect(status).toContain('1994: 0.40 ppm average');
  expect(status).toContain('2 samples (6 fish)');
  expect(status).toContain('sampled Aug 12 and Sep 1');
});

test('many sampling dates in a year are shown as a range', async () => {
  const many = ['03-02', '04-10', '05-05', '06-20', '10-03'].map((md) => (
    { date: `2001-${md}`, value: 0.3, nd: false, weightG: 400, lengthCm: 30, nFish: 2, composite: true }));
  render(TrendChart, { years: { '2001': [1.5, 5] }, samples: many, cuts: CUTS });
  await fireEvent.click(screen.getByRole('button', { name: '2001: 0.30 ppm' }));
  const status = screen.getByRole('status').textContent.replace(/\s+/g, ' ');
  expect(status).toContain('5 samples (10 fish)');
  expect(status).toContain('sampled Mar 2 – Oct 3 (5 dates)');
});

test('every sample dot lands inside the plot, even when all samples share one year', () => {
  // Lake Peigneur sheepshead: both samples on 2001-05-31.
  const sheep = [
    { date: '2001-05-31', value: 0.08, nd: false, weightG: 1530.9, lengthCm: 44, nFish: 1, composite: false },
    { date: '2001-05-31', value: 0.07, nd: false, weightG: 949.7, lengthCm: 35.9, nFish: 2, composite: true },
  ];
  const { container } = render(TrendChart, { years: { '2001': [0.15, 2] }, samples: sheep, cuts: [34.7, 40.5] });
  const xs = [...container.querySelectorAll('circle.sample')].map((c) => Number(c.getAttribute('cx')));
  expect(xs).toHaveLength(2);
  expect(Math.abs(xs[0] - xs[1])).toBeGreaterThanOrEqual(6); // same-day samples are nudged apart to be tappable
  for (const x of xs) expect(x).toBeGreaterThanOrEqual(34);
  for (const x of xs) expect(x).toBeLessThanOrEqual(332);
});

test('samples early in the first year and late in the last year stay inside the plot', () => {
  const edge = [
    { date: '1994-01-15', value: 0.2, nd: false, weightG: 300, lengthCm: 30, nFish: 1, composite: false },
    { date: '2016-12-20', value: 0.3, nd: false, weightG: 300, lengthCm: 30, nFish: 1, composite: false },
  ];
  const { container } = render(TrendChart, { years: { '1994': [0.2, 1], '2016': [0.3, 1] }, samples: edge, cuts: CUTS });
  const xs = [...container.querySelectorAll('circle.sample')].map((c) => Number(c.getAttribute('cx')));
  expect(Math.min(...xs)).toBeGreaterThanOrEqual(34);
  expect(Math.max(...xs)).toBeLessThanOrEqual(332);
});

test('the chart enlarges to full screen with its title, zooms in time, and Escape closes it', async () => {
  render(TrendChart, { years: YEARS, samples: SAMPLES, cuts: CUTS, title: 'Largemouth Bass · Test Site' });
  await fireEvent.click(screen.getByRole('button', { name: 'Enlarge chart' }));
  const dialog = screen.getByRole('dialog');
  expect(dialog.textContent).toContain('Largemouth Bass · Test Site');
  expect(dialog.parentNode).toBe(document.body); // lifted out of the drawer
  // Same chart: layer chips and point details still work.
  await fireEvent.click(screen.getByRole('button', { name: /Sep 1, 1994/ }));
  expect(screen.getByRole('status').textContent).toContain('Sep 1, 1994');
  expect(screen.getByRole('button', { name: 'Zoom out on years' }).disabled).toBe(true);
  await fireEvent.click(screen.getByRole('button', { name: 'Zoom in on years' }));
  expect(screen.getByRole('button', { name: 'Reset' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Zoom out on years' }).disabled).toBe(false);
  await fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
  expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull();
  await fireEvent.keyDown(window, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('status').textContent).toContain('Sep 1, 1994'); // selection kept after closing
});

test('in full screen, touch drags on the chart are not left to the browser to scroll', async () => {
  render(TrendChart, { years: YEARS, samples: SAMPLES, cuts: CUTS });
  const svg = () => document.querySelector('svg[aria-label="Mercury over time, by sample"]');
  const move = () => {
    const e = new Event('touchmove', { bubbles: true, cancelable: true });
    svg().dispatchEvent(e);
    return e.defaultPrevented;
  };
  expect(move()).toBe(false); // inline chart: the drawer still scrolls normally
  await fireEvent.click(screen.getByRole('button', { name: 'Enlarge chart' }));
  expect(move()).toBe(true);
});

test('a selected sample is ringed; tapping empty chart space or the same point again clears the selection', async () => {
  const { container } = render(TrendChart, { years: YEARS, samples: SAMPLES, cuts: CUTS });
  const svg = container.querySelector('svg');
  const ring = () => container.querySelector('circle.ring');
  await fireEvent.click(screen.getByRole('button', { name: /Sep 1, 1994/ }));
  expect(ring()).toBeTruthy();
  await fireEvent.click(svg);
  expect(ring()).toBeNull();
  expect(screen.getByRole('status').textContent).toContain('Tap any point for details');

  await fireEvent.click(screen.getByRole('button', { name: '1994: 0.40 ppm' }));
  expect(ring()).toBeTruthy();
  await fireEvent.click(svg);
  expect(ring()).toBeNull();

  await fireEvent.click(screen.getByRole('button', { name: '1994: 0.40 ppm' }));
  await fireEvent.click(screen.getByRole('button', { name: '1994: 0.40 ppm' }));
  expect(ring()).toBeNull();
});
