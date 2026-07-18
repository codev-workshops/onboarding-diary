import { expect, test, type Page } from '@playwright/test';

const PASSWORD = 'Passw0rd!';

async function loginAs(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
}

test('a recruit is redirected to their dashboard after login', async ({ page }) => {
  await loginAs(page, 'recruit.rina@demo.local');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});

test('a manager is redirected to the team overview after login', async ({ page }) => {
  await loginAs(page, 'manager.eng@demo.local');
  await expect(page).toHaveURL(/\/team$/);
  await expect(page.getByRole('heading', { name: 'Team' })).toBeVisible();
});

test('an admin is redirected to the organization overview after login', async ({ page }) => {
  await loginAs(page, 'admin@demo.local');
  await expect(page).toHaveURL(/\/overview$/);
  await expect(page.getByRole('heading', { name: 'Organization overview' })).toBeVisible();
});

test("a recruit cannot open another role's landing or admin route", async ({ page }) => {
  await loginAs(page, 'recruit.rina@demo.local');
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto('/team');
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto('/overview');
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto('/admin');
  await expect(page).toHaveURL(/\/dashboard$/);
});

test('manager team overview lists overseen recruits', async ({ page }) => {
  await loginAs(page, 'manager.eng@demo.local');
  await expect(page.getByRole('heading', { name: 'Team' })).toBeVisible();
  await expect(page.getByText('Rina Recruit')).toBeVisible();
  await expect(page.getByText('Task completion').first()).toBeVisible();
});

test('demo mode surfaces pre-provisioned accounts and password on login', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByText(/pre-provisioned accounts/i)).toBeVisible();
  await expect(page.getByText('admin@demo.local', { exact: false })).toBeVisible();
  await expect(page.getByText('manager.eng@demo.local', { exact: false })).toBeVisible();
  // Clicking an account fills the form, then sign-in routes to that role's landing.
  await page.getByRole('button', { name: /Marcus Manager/ }).click();
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/team$/);
});
