import { expect, test } from '@playwright/test';

const DEMO_ADMIN = { email: 'admin@demo.local', password: 'Passw0rd!' };

// Suppress the first-use Joyride tour so its spotlight overlay doesn't intercept clicks.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('onboarding.tour.done', 'true'));
});

async function login(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(DEMO_ADMIN.email);
  await page.getByLabel('Password').fill(DEMO_ADMIN.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

test('admin can log in and see the dashboard summary', async ({ page }) => {
  await login(page);
  await expect(page.getByText('Completion', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recent entries' })).toBeVisible();
});

test('rejects invalid credentials', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(DEMO_ADMIN.email);
  await page.getByLabel('Password').fill('wrong-password');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('alert')).toContainText(/invalid/i);
});

test('admin can create a task and see it in the list', async ({ page }) => {
  await login(page);
  await page.getByRole('link', { name: 'Tasks' }).click();
  await expect(page.getByRole('heading', { name: 'Task Log' })).toBeVisible();

  const title = `E2E task ${Date.now()}`;
  await page.getByRole('button', { name: /new task/i }).click();
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Description').fill('Created by an end-to-end test.');
  await page.getByRole('button', { name: /^save$/i }).click();

  await expect(page.getByText(title)).toBeVisible();
});
