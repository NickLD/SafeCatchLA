import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { beforeEach, expect, test, vi } from 'vitest';
import TopBar from '../src/components/TopBar.svelte';
import { app } from '../src/lib/state.svelte.js';

const SITES = [
  { id: '1', name: 'Vermilion River North of Perry', address: '2.1 miles south of Abbeville', n: 5,
    species: { BOWFIN: { n: 5, latest: ['2020-01-01', 0.4], years: { '2020': [2, 5] } } } },
  { id: '2', name: 'Abbeville Canal', address: '', n: 9,
    species: { 'LARGEMOUTH BASS': { n: 9, latest: ['2020-01-01', 0.4], years: { '2020': [3, 9] } } } },
];

beforeEach(() => {
  app.sites = SITES;
  app.period = 10;
  app.filter = 'ALL';
});

test('search shows matching sites and picking one calls onPick', async () => {
  const onPick = vi.fn();
  render(TopBar, { onPick, onLocate: () => {} });
  await fireEvent.input(screen.getByRole('searchbox'), { target: { value: 'abbe' } });
  const results = within(screen.getByRole('listbox')).getAllByRole('option');
  expect(results).toHaveLength(2);
  await fireEvent.click(results[0]);
  expect(onPick).toHaveBeenCalledWith(SITES[1]);
});

test('period select updates app state', async () => {
  render(TopBar, { onPick: () => {}, onLocate: () => {} });
  await fireEvent.change(screen.getByLabelText('Period'), { target: { value: 'all' } });
  expect(app.period).toBe('all');
});

test('species filter lists species by sample count', () => {
  render(TopBar, { onPick: () => {}, onLocate: () => {} });
  const opts = [...screen.getByLabelText('Species').querySelectorAll('option')].map((o) => o.textContent);
  expect(opts).toEqual(['All species', 'Largemouth Bass', 'Bowfin']);
});

test('contaminant pill lists mercury', () => {
  render(TopBar, { onPick: () => {}, onLocate: () => {} });
  const opts = [...screen.getByLabelText('Contaminant').querySelectorAll('option')].map((o) => o.textContent);
  expect(opts).toEqual(['Mercury']);
});
