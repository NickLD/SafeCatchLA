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
  // No EPA national figure for bowfin: the row is left out rather than shown empty.
  expect(within(compare).queryByText('U.S. lakes (EPA 2022)')).toBeNull();
  expect(within(compare).queryByText('no national data')).toBeNull();
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

test('single-sample site uses singular wording and latest shows its count', () => {
  const one = { ...SITE, n: 1, species: { BOWFIN: { n: 1, latest: ['2016-05-01', 0.2, 1], years: { '2016': [0.2, 1] } } } };
  Object.assign(app, { sites: [one], latestYear: 2026, period: 'all', site: '0001', species: 'BOWFIN', compare: null });
  render(SiteSheet, { site: one, national: NATIONAL, latestYear: 2026, period: 'all' });
  expect(screen.getByText(/1 sample · last 2016/)).toBeTruthy();
  expect(screen.queryByText(/1 samples/)).toBeNull();
  const summary = screen.getByRole('region', { name: 'Summary' });
  expect(within(summary).getByText('1 sample · 2016')).toBeTruthy();
});

test('disclaimer is one compact line until expanded', async () => {
  renderSheet();
  const note = screen.getByRole('note');
  expect(note.textContent).toMatch(/This is not health advice/);
  expect(note.textContent).not.toMatch(/may be above advisory levels/);
  await fireEvent.click(screen.getByRole('button', { name: 'More about this warning' }));
  expect(note.textContent).toMatch(/Mercury averages here may be above advisory levels/);
});

test('change tile follows the period and can switch to previous sample', async () => {
  const site = { ...SITE, species: { 'LARGEMOUTH BASS': { n: 6, latest: ['2018-05-01', 0.2, 1],
    years: { '1994': [0.8, 1], '1995': [0.6, 1], '2008': [0.5, 2], '2016': [0.3, 1], '2018': [0.2, 1] } } } };
  Object.assign(app, { sites: [site], latestYear: 2026, period: 20, site: '0001', species: 'LARGEMOUTH BASS', compare: null });
  render(SiteSheet, { site, national: NATIONAL, latestYear: 2026, period: 20 });
  const summary = screen.getByRole('region', { name: 'Summary' });
  expect(within(summary).getByText('0%')).toBeTruthy();
  expect(within(summary).getByText('since 2008')).toBeTruthy();
  await fireEvent.change(within(summary).getByLabelText('Compare change'), { target: { value: 'previous' } });
  expect(within(summary).getByText('↓33%')).toBeTruthy();
  expect(within(summary).getByText('2018 vs 2016')).toBeTruthy();
});

const MIXED_SITE = {
  ...SITE,
  species: {
    'LARGEMOUTH BASS': { n: 3, latest: ['2016-05-01', 0.31, 1], years: { '2016': [0.93, 3] } },
    BOWFIN: { n: 9, latest: ['1994-05-01', 0.5, 9], years: { '1994': [4.5, 9] } },
  },
};

test('species with no samples in the period are left out', () => {
  Object.assign(app, { sites: [MIXED_SITE], latestYear: 2026, period: 20, site: '0001', species: 'BOWFIN', compare: null });
  render(SiteSheet, { site: MIXED_SITE, national: NATIONAL, latestYear: 2026, period: 20 });
  const chips = screen.getByRole('radiogroup', { name: 'Species' });
  expect(within(chips).getAllByRole('radio').map((r) => r.textContent.trim())).toEqual(['Largemouth Bass']);
  expect(screen.queryByText(/no samples in period/)).toBeNull();
  const items = within(screen.getByRole('list', { name: 'All species here' })).getAllByRole('listitem');
  expect(items).toHaveLength(1);
  const compareOpts = [...screen.getByLabelText('Compare species').querySelectorAll('option')].map((o) => o.textContent);
  expect(compareOpts).toEqual(['Largemouth Bass', 'All species (mixed)']);
});

test('a site with nothing in the period still offers all its species', () => {
  Object.assign(app, { sites: [MIXED_SITE], latestYear: 2026, period: 5, site: '0001', species: null, compare: null });
  render(SiteSheet, { site: MIXED_SITE, national: NATIONAL, latestYear: 2026, period: 5 });
  const chips = screen.getByRole('radiogroup', { name: 'Species' });
  expect(within(chips).getAllByRole('radio')).toHaveLength(2);
});

test('drawer credits LDEQ with links and an independence disclaimer', () => {
  renderSheet();
  expect(screen.getByRole('link', { name: /this site's records on LDEQ/ }).getAttribute('href'))
    .toBe('https://waterdata.deq.louisiana.gov/Collection_Data/WQ1994001/0001');
  expect(screen.getByRole('link', { name: /LDEQ mercury database/ }).getAttribute('href'))
    .toBe('https://waterdata.deq.louisiana.gov/MercuryData');
  expect(screen.getByText(/not affiliated with or endorsed by LDEQ, LDH or EPA/)).toBeTruthy();
});

test('data source footer shows last pull and last change', () => {
  Object.assign(app, { meta: { updated: '2026-10-24' }, status: { checkedAt: '2026-10-31T11:02:00Z' } });
  renderSheet();
  expect(screen.getByText(/last pulled from LDEQ on Oct 31, 2026 \(data last changed Oct 24, 2026\)\./)).toBeTruthy();
  expect(screen.getByText(/data last changed Oct 24, 2026/)).toBeTruthy();
  Object.assign(app, { meta: null, status: null });
});

test('peek shows a swipe hint that expands the drawer', async () => {
  localStorage.removeItem('safecatch.expandedOnce');
  renderSheet();
  await fireEvent.click(screen.getByRole('button', { name: /Swipe up for full history/ }));
  expect(screen.getByRole('button', { name: 'Collapse details' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Swipe up for full history/ })).toBeNull();
  expect(localStorage.getItem('safecatch.expandedOnce')).toBe('1');
});

test('single-sample results carry a 1-sample warning', () => {
  const one = {
    ...SITE, n: 4,
    species: {
      BOWFIN: { n: 1, latest: ['2016-05-01', 0.5, 1], years: { '2016': [0.5, 1] } },
      'LARGEMOUTH BASS': { n: 3, latest: ['2016-05-01', 0.31, 3], years: { '1994': [0.5, 1], '2016': [0.93, 3] } },
    },
  };
  Object.assign(app, { sites: [one], latestYear: 2026, period: 'all', site: '0001', species: 'BOWFIN', compare: null });
  render(SiteSheet, { site: one, national: NATIONAL, latestYear: 2026, period: 'all' });
  const summary = screen.getByRole('region', { name: 'Summary' });
  expect(within(summary).getAllByText('⚠ 1 fish').length).toBe(2); // avg and latest tiles
  expect(within(screen.getByRole('region', { name: 'Compare' })).getByText('⚠ 1 fish')).toBeTruthy();
  const rows = within(screen.getByRole('list', { name: 'All species here' })).getAllByRole('listitem');
  expect(rows.find((r) => r.textContent.startsWith('Bowfin')).textContent).toContain('⚠ 1 fish');
  expect(rows.find((r) => r.textContent.startsWith('Largemouth')).textContent).not.toContain('⚠');
});

test('change tile warns when an end of the comparison is a single sample', async () => {
  const site = { ...SITE, species: { 'LARGEMOUTH BASS': { n: 4, latest: ['2016-05-01', 0.3, 3], years: { '1994': [0.5, 1], '2016': [0.9, 3] } } } };
  Object.assign(app, { sites: [site], latestYear: 2026, period: 'all', site: '0001', species: 'LARGEMOUTH BASS', compare: null });
  render(SiteSheet, { site, national: NATIONAL, latestYear: 2026, period: 'all' });
  const summary = screen.getByRole('region', { name: 'Summary' });
  expect(within(summary).getByText('⚠ 1 fish at start')).toBeTruthy();
});

test('data source explains duplicate handling with the merge count', () => {
  Object.assign(app, { meta: { updated: '2026-10-24', mergedDuplicates: 1255, skipped: { rejected: 26, shellfish: 69 } }, status: null });
  renderSheet();
  expect(screen.getByText(/1,255 lab field duplicates/)).toBeTruthy();
  expect(screen.getByText(/averaged into one sample/)).toBeTruthy();
  expect(screen.getByText(/26 results LDEQ marked as rejected/)).toBeTruthy();
  Object.assign(app, { meta: null });
});

test('one sample of many fish gets no single-fish warning', () => {
  const comp = { ...SITE, n: 1, species: { BOWFIN: { n: 1, latest: ['2016-05-01', 0.5, 1, 10], years: { '2016': [0.5, 1, 10] } } } };
  Object.assign(app, { sites: [comp], latestYear: 2026, period: 'all', site: '0001', species: 'BOWFIN', compare: null });
  render(SiteSheet, { site: comp, national: NATIONAL, latestYear: 2026, period: 'all' });
  expect(screen.queryByText(/⚠ 1 fish/)).toBeNull();
  expect(within(screen.getByRole('region', { name: 'Summary' })).getByText(/1 sample \(10 fish\)/)).toBeTruthy();
});
