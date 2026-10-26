import { render, screen } from '@testing-library/svelte';
import { expect, test } from 'vitest';
import Legend from '../src/components/Legend.svelte';
import { app } from '../src/lib/state.svelte.js';

test('legend names the contaminant and sample type', () => {
  Object.assign(app, { color: 'avg', filter: ['LARGEMOUTH BASS'], range: null, meta: null });
  render(Legend);
  expect(screen.getByText('Average Concentration Over Time (ppm)')).toBeTruthy();
  expect(screen.getByText(/Mercury in fish tissue · Largemouth Bass/)).toBeTruthy();
});

test('legend links the data sources and notes independence', () => {
  Object.assign(app, { color: 'avg', filter: [], range: null, meta: { updated: '2026-10-24' }, status: null });
  render(Legend);
  expect(screen.getByRole('link', { name: 'Louisiana DEQ' }).getAttribute('href')).toBe('https://waterdata.deq.louisiana.gov/MercuryData');
  expect(screen.getByRole('link', { name: 'EPA 2022' }).getAttribute('href'))
    .toBe('https://www.epa.gov/choose-fish-and-shellfish-wisely/2022-national-lakes-assessment-fish-tissue-study');
  expect(screen.getByText(/Independent project/)).toBeTruthy();
});

test('legend shows when data was last pulled from LDEQ', () => {
  Object.assign(app, { color: 'avg', filter: [], range: null, meta: { updated: '2026-10-24' }, status: { checkedAt: '2026-10-31T11:02:00Z' } });
  render(Legend);
  expect(screen.getByText(/last pulled Oct 31, 2026/)).toBeTruthy();
  expect(screen.getByText(/data changed Oct 24, 2026/)).toBeTruthy();
});

test('legend names a multi-species selection as mixed', () => {
  Object.assign(app, { color: 'avg', filter: ['LARGEMOUTH BASS', 'BLUEGILL'], range: null, meta: null, sites: [] });
  render(Legend);
  expect(screen.getByText(/Mercury in fish tissue · 2 species \(mixed\)/)).toBeTruthy();
});
