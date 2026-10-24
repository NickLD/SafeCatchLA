import { expect, test } from '@playwright/test';

test('tap a site opens sheet with disclaimer', async ({ page }) => {
  await page.goto('/SafeCatchLA/');
  await page.locator('path.leaflet-interactive').first().click({ force: true });
  await expect(page.getByText(/This is not health advice/)).toBeVisible();
});

test('deep link opens Lake Henderson', async ({ page }) => {
  await page.goto('/SafeCatchLA/#site=0436');
  await expect(page.getByRole('heading', { name: /Lake Henderson/ })).toBeVisible();
});

test('bad deep link still loads map', async ({ page }) => {
  await page.goto('/SafeCatchLA/#site=nope&period=7&color=zzz');
  await expect(page.locator('path.leaflet-interactive').first()).toBeVisible();
  await expect(page.getByText(/This is not health advice/)).toHaveCount(0);
});

test('never requests DEQ', async ({ page }) => {
  const hosts = [];
  page.on('request', (r) => hosts.push(new URL(r.url()).host));
  await page.goto('/SafeCatchLA/#site=0436');
  await page.waitForLoadState('networkidle');
  expect(hosts.filter((h) => h.includes('deq.louisiana.gov'))).toEqual([]);
});

test('registers a service worker with a manifest', async ({ page }) => {
  await page.goto('/SafeCatchLA/');
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  const registered = await page.evaluate(async () => !!(await navigator.serviceWorker?.getRegistration()));
  expect(registered).toBe(true);
});

test('stale species and filter in a link are replaced', async ({ page }) => {
  await page.goto('/SafeCatchLA/#site=0436&species=NOT%20A%20FISH&filter=FOO');
  const compare = page.getByRole('region', { name: 'Compare' });
  await expect(compare.getByText('Louisiana')).toBeVisible();
  await expect(compare.getByText('no samples in period')).toHaveCount(0);
  await expect(page.getByLabel('Species', { exact: true }).first()).toHaveValue('ALL');
});

test('tapping the map closes the sheet', async ({ page }) => {
  await page.goto('/SafeCatchLA/#site=0436');
  await expect(page.getByText(/This is not health advice/)).toBeVisible();
  await page.evaluate(() => {
    const el = document.querySelector('.leaflet-container');
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 5, clientY: 300 }));
  });
  await expect(page.getByText(/This is not health advice/)).toHaveCount(0);
});
