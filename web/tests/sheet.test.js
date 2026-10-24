import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { beforeEach, expect, test, vi } from 'vitest';

vi.mock('../src/lib/data.js', () => ({
  loadSiteDetail: vi.fn(async () => ({ id: '0001', species: {} })),
}));

const { default: SiteSheet } = await import('../src/components/SiteSheet.svelte');
const { app } = await import('../src/lib/state.svelte.js');
const { LDH_ADVISORIES_URL } = await import('../src/lib/config.js');

const SITE = {
  id: '0001', name: 'Lake Test', address: 'near Henderson', basin: '05', n: 6, last: '2016-05-01',
  species: {
    'LARGEMOUTH BASS': { n: 3, latest: ['2016-05-01', 0.31], years: { '1994': [1.4, 2], '2016': [0.31, 1] } },
    BOWFIN: { n: 3, latest: ['2016-05-01', 0.2], years: { '1994': [0.3, 2], '2016': [0.2, 1] } },
  },
};
const NATIONAL = { all: { mean: 0.284, n: 413 }, species: { 'LARGEMOUTH BASS': { mean: 0.334, n: 273 } } };

function renderSheet(period = 'all') {
  Object.assign(app, { sites: [SITE], latestYear: 2026, period, site: '0001', species: 'LARGEMOUTH BASS', compare: null });
  return render(SiteSheet, { site: SITE, national: NATIONAL, latestYear: 2026, period });
}

beforeEach(() => history.replaceState(null, '', '/'));

test('shows disclaimer and LDH link', () => {
  renderSheet();
  expect(screen.getByText(/This is not health advice/)).toBeTruthy();
  expect(screen.getByRole('link', { name: /fish consumption advisories/ }).getAttribute('href')).toBe(LDH_ADVISORIES_URL);
});

test('headline uses selected period', () => {
  renderSheet('all');
  const summary = screen.getByRole('region', { name: 'Summary' });
  expect(within(summary).getByText('0.57')).toBeTruthy();
});

test('headline with nothing in the period', () => {
  renderSheet(5);
  const summary = screen.getByRole('region', { name: 'Summary' });
  expect(within(summary).getByText('No samples in period')).toBeTruthy();
});

test('CompareBars shows no national data', async () => {
  renderSheet();
  const compare = screen.getByRole('region', { name: 'Compare' });
  expect(within(compare).getByText('U.S. lakes (EPA 2022)')).toBeTruthy();
  expect(within(compare).getByText('Mermentau basin')).toBeTruthy();
  expect(within(compare).queryByText('no national data')).toBeNull();
  await fireEvent.change(within(compare).getByLabelText('Compare species'), { target: { value: 'BOWFIN' } });
  expect(within(compare).getByText('no national data')).toBeTruthy();
});

test('expand button toggles state', async () => {
  renderSheet();
  await fireEvent.click(screen.getByRole('button', { name: 'Expand details' }));
  expect(screen.getByRole('button', { name: 'Collapse details' })).toBeTruthy();
});

test('all species list orders by mean', () => {
  renderSheet();
  const items = within(screen.getByRole('list', { name: 'All species here' })).getAllByRole('listitem');
  expect(items[0].textContent).toMatch(/^Largemouth Bass/);
  expect(items[1].textContent).toMatch(/^Bowfin/);
});

test('close clears the selected site', async () => {
  renderSheet();
  await fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(app.site).toBeNull();
});
