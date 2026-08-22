import { expect, test } from '@playwright/test';

test('health endpoint reports the database as up', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ status: 'ok', database: 'up' });
});

test('landing page renders the application shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Onboarding Diary' })).toBeVisible();
});
