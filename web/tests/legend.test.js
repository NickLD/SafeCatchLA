import { render, screen } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import Legend from '../src/components/Legend.svelte';
import { app } from '../src/lib/state.svelte.js';

test('legend names the contaminant and sample type', () => {
  Object.assign(app, { color: 'avg', filter: 'LARGEMOUTH BASS', range: null, meta: null });
  render(Legend);
  expect(screen.getByText('Average Concentration Over Time (ppm)')).toBeTruthy();
  expect(screen.getByText(/Mercury in fish tissue · Largemouth Bass/)).toBeTruthy();
});

test('legend links the data sources and notes independence', () => {
  Object.assign(app, { color: 'avg', filter: 'ALL', range: null, meta: { updated: '2026-10-24' } });
  render(Legend);
  expect(screen.getByRole('link', { name: 'Louisiana DEQ' }).getAttribute('href')).toBe('https://waterdata.deq.louisiana.gov/MercuryData');
  expect(screen.getByRole('link', { name: 'EPA 2022' }).getAttribute('href'))
    .toBe('https://www.epa.gov/choose-fish-and-shellfish-wisely/2022-national-lakes-assessment-fish-tissue-study');
  expect(screen.getByText(/Independent project/)).toBeTruthy();
});
