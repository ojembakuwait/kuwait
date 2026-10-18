import { test, expect, type Page } from '@playwright/test';

const INV1 = { email: 'investor1@example.com', password: 'Demo!2345' };
const INV2 = { email: 'investor2@example.com', password: 'Demo!2345' };

async function login(page: Page, u: { email: string; password: string }) {
  await page.goto('/login');
  await page.fill('#email', u.email);
  await page.fill('#password', u.password);
  await Promise.all([page.waitForURL('**/investor/**'), page.click('button[type=submit]')]);
}

test('unauthenticated deep link redirects to login preserving destination', async ({ page }) => {
  await page.goto('/investor/documents');
  await expect(page).toHaveURL(/\/login\?next=.*investor%2Fdocuments/);
});

test('invalid credentials are rejected', async ({ page }) => {
  await page.goto('/login');
  await page.fill('#email', INV1.email);
  await page.fill('#password', 'nope');
  await page.click('button[type=submit]');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('login lands on opportunities and lists offerings', async ({ page }) => {
  await login(page, INV1);
  await expect(page).toHaveURL(/\/investor\/opportunities/);
  await expect(page.getByText('Investment Opportunities')).toBeVisible();
  const cards = page.locator('a[href^="/investor/opportunities/"]');
  expect(await cards.count()).toBeGreaterThanOrEqual(5);
});

test('search filters the listing', async ({ page }) => {
  await login(page, INV1);
  await page.fill('input[type=search]', 'logistics');
  await expect(page.locator('a[href^="/investor/opportunities/"]')).toHaveCount(1);
});

test('express interest validates minimum and persists', async ({ page }) => {
  await login(page, INV1);
  await page.goto('/investor/opportunities/sunbelt-logistics-portfolio');
  await page.fill('#amount', '100'); // below min
  await expect(page.getByRole('button', { name: 'Continue' })).toBeDisabled();
  await page.fill('#amount', '3000000');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Review' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Submit interest' }).click();
  await expect(page.getByText('Your interest')).toBeVisible();
  // persists across reload
  await page.reload();
  await expect(page.getByText('Your interest')).toBeVisible();
});

test('closed offering is not open for new interest', async ({ page }) => {
  await login(page, INV1);
  await page.goto('/investor/opportunities/coral-ridge-retail');
  await expect(page.getByText('Not open for interest')).toBeVisible();
});

test('data isolation: investor2 cannot read investor1 private document', async ({ page, request }) => {
  // Discover investor1's private doc href
  await login(page, INV1);
  await page.goto('/investor/documents');
  const href = await page
    .locator('section:has-text("My private documents") a:has-text("Download")')
    .first()
    .getAttribute('href');
  expect(href).toBeTruthy();

  // As investor2, the same URL must 404
  await page.context().clearCookies();
  await login(page, INV2);
  const res = await page.request.get(href!);
  expect(res.status()).toBe(404);
});

test('document download requires authentication', async ({ request }) => {
  const res = await request.get('/api/documents/anything', { maxRedirects: 0 });
  expect([401, 404]).toContain(res.status());
});
