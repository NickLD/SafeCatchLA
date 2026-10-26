import { expect, test } from '@playwright/test';

test('tap a site opens sheet with disclaimer', async ({ page }) => {
  await page.goto('/');
  await page.locator('path.leaflet-interactive').first().click({ force: true });
  await expect(page.getByText(/This is not health advice/)).toBeVisible();
});

test('deep link opens Lake Henderson', async ({ page }) => {
  await page.goto('/#site=0436');
  await expect(page.getByRole('heading', { name: /Lake Henderson/ })).toBeVisible();
});

test('bad deep link still loads map', async ({ page }) => {
  await page.goto('/#site=nope&period=7&color=zzz');
  await expect(page.locator('path.leaflet-interactive').first()).toBeVisible();
  await expect(page.getByText(/This is not health advice/)).toHaveCount(0);
});

test('never requests DEQ', async ({ page }) => {
  const hosts = [];
  page.on('request', (r) => hosts.push(new URL(r.url()).host));
  await page.goto('/#site=0436');
  await page.waitForLoadState('networkidle');
  expect(hosts.filter((h) => h.includes('deq.louisiana.gov'))).toEqual([]);
});

test('registers a service worker with a manifest', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  const registered = await page.evaluate(async () => !!(await navigator.serviceWorker?.getRegistration()));
  expect(registered).toBe(true);
});

test('stale species and filter in a link are replaced', async ({ page }) => {
  await page.goto('/#site=0436&species=NOT%20A%20FISH&filter=FOO');
  const compare = page.getByRole('region', { name: 'Compare' });
  await expect(compare.getByText('Louisiana')).toBeVisible();
  await expect(compare.getByText('no samples in period')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Species: All species' })).toBeVisible();
});

test('tapping the map closes the sheet', async ({ page }) => {
  await page.goto('/#site=0436');
  await expect(page.getByText(/This is not health advice/)).toBeVisible();
  await page.evaluate(() => {
    const el = document.querySelector('.leaflet-container');
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 5, clientY: 300 }));
  });
  await expect(page.getByText(/This is not health advice/)).toHaveCount(0);
});

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });

  test('filter pills use the space up to the drawer and only fade when they overflow', async ({ page }) => {
    await page.goto('/#site=0436');
    await expect(page.getByRole('heading', { name: /Lake Henderson/ })).toBeVisible();
    const drawer = await page.getByRole('complementary', { name: 'Site details' }).boundingBox();
    const row = page.locator('.pills');
    const box = await row.boundingBox();
    expect(box.x + box.width).toBeLessThanOrEqual(drawer.x);
    expect(box.x + box.width).toBeGreaterThan(drawer.x - 40); // reaches the drawer
    const { overflow, mask } = await row.evaluate((el) => ({
      overflow: el.scrollWidth > el.clientWidth + 1,
      mask: getComputedStyle(el).maskImage,
    }));
    expect(overflow).toBe(false);
    expect(mask).toBe('none');
  });
});

test('Chrome reports the app as installable', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium');
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  const cdp = await page.context().newCDPSession(page);
  const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
  expect(installabilityErrors).toEqual([]);
  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest.icons.find((i) => i.purpose === 'maskable').src).toBe('icon-maskable-512.png');
});

test('swipe hint expands the drawer and is not shown again', async ({ page }) => {
  await page.goto('/#site=0436');
  const hint = page.getByRole('button', { name: /Swipe up for full history/ });
  await expect(hint).toBeVisible();
  await hint.click();
  await expect(page.getByRole('button', { name: 'Collapse details' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: /Lake Henderson/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Swipe up for full history/ })).toHaveCount(0);
});

test('species picker opens above the map and selecting a group filters the map', async ({ page }) => {
  await page.goto('/#period=all');
  await page.getByRole('button', { name: 'Species: All species' }).click();
  await page.getByRole('checkbox', { name: 'Bass', exact: true }).click(); // fails if the panel is hidden under the map
  await expect(page.getByRole('button', { name: /^Species: Bass \(\d+\)$/ })).toBeVisible();
  await expect(page).toHaveURL(/filter=LARGEMOUTH%20BASS/);
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('dialog', { name: 'Choose species' })).toHaveCount(0);
});
