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
  app.filter = [];
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


test('contaminant pill lists mercury', () => {
  render(TopBar, { onPick: () => {}, onLocate: () => {} });
  const opts = [...screen.getByLabelText('Contaminant').querySelectorAll('option')].map((o) => o.textContent);
  expect(opts).toEqual(['Mercury']);
});


const BASS_SITES = [
  { id: '1', name: 'A', address: '', n: 9, species: {
    'LARGEMOUTH BASS': { n: 6, latest: ['2024-01-01', 0.4], years: { '2024': [2, 6] } },
    'SPOTTED BASS': { n: 2, latest: ['2024-01-01', 0.4], years: { '2024': [1, 2] } },
    BLUEGILL: { n: 1, latest: ['2024-01-01', 0.1], years: { '2024': [0.1, 1] } },
    BOWFIN: { n: 9, latest: ['2001-01-01', 0.5], years: { '2001': [4, 9] } },
  } },
];

function openPicker() {
  Object.assign(app, { sites: BASS_SITES, period: 5, latestYear: 2026, filter: [] });
  render(TopBar, { onPick: () => {}, onLocate: () => {} });
  return fireEvent.click(screen.getByRole('button', { name: 'Species: All species' }));
}

test('species picker groups species and hides ones with no samples in the period', async () => {
  await openPicker();
  const dialog = screen.getByRole('dialog', { name: 'Choose species' });
  const boxes = within(dialog).getAllByRole('checkbox').map((c) => c.getAttribute('aria-label'));
  expect(boxes).toEqual(['All species', 'Bass', 'Largemouth Bass', 'Spotted Bass', 'Sunfish (bream)', 'Bluegill']);
});

test('checking a group selects all its species; unchecking one makes the group partial', async () => {
  await openPicker();
  const dialog = screen.getByRole('dialog', { name: 'Choose species' });
  await fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Bass' }));
  expect(app.filter).toEqual(['LARGEMOUTH BASS', 'SPOTTED BASS']);
  expect(screen.getByRole('button', { name: 'Species: Bass (2)' })).toBeTruthy();
  await fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Spotted Bass' }));
  expect(app.filter).toEqual(['LARGEMOUTH BASS']);
  expect(within(dialog).getByRole('checkbox', { name: 'Bass' }).getAttribute('aria-checked')).toBe('mixed');
  await fireEvent.click(within(dialog).getByRole('checkbox', { name: 'Bluegill' }));
  expect(screen.getByRole('button', { name: 'Species: 2 species' })).toBeTruthy();
  await fireEvent.click(within(dialog).getByRole('checkbox', { name: 'All species' }));
  expect(app.filter).toEqual([]);
});

test('period pill lets you specify a custom number of years', async () => {
  Object.assign(app, { sites: [], period: 10, latestYear: 2026, filter: [] });
  render(TopBar, { onPick: () => {}, onLocate: () => {} });
  await fireEvent.change(screen.getByLabelText('Period'), { target: { value: 'custom' } });
  const dialog = screen.getByRole('dialog', { name: 'Custom period' });
  await fireEvent.input(within(dialog).getByLabelText('Number of years'), { target: { value: '7' } });
  await fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }));
  expect(app.period).toBe(7);
  expect(screen.queryByRole('dialog', { name: 'Custom period' })).toBeNull();
  const select = screen.getByLabelText('Period');
  expect(select.value).toBe('7');
  expect([...select.querySelectorAll('option')].map((o) => o.textContent)).toContain('Last 7 yrs');
});
