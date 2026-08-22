import { expect, test, type Page } from '@playwright/test';

/**
 * The task slice end to end: filter, create, edit, delete, and the responsive
 * layout switch. The authorization proof lives in the integration suite; what
 * this adds is that the browser path actually reaches those endpoints.
 */
const PASSWORD = process.env.SEED_PASSWORD ?? 'Passw0rd!23';
const RECRUIT = 'priya.sharma@onboarding.test';
const MANAGER = 'marcus.bell@onboarding.test';

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('a recruit creates, edits and deletes a task', async ({ page }) => {
  const title = `Playwright task ${Date.now()}`;

  await signIn(page, RECRUIT);
  await page.getByRole('link', { name: 'Tasks' }).click();
  await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'New task' }).click();
  // Scoped to the dialog: the filter bar has its own Status control.
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Title').fill(title);
  await dialog.getByLabel('Description').fill('Created by the end-to-end suite.');
  await dialog.getByLabel('Status').selectOption('IN_PROGRESS');
  await dialog.getByRole('button', { name: 'Save task' }).click();

  const row = page.getByRole('row', { name: new RegExp(title) });
  await expect(row).toBeVisible();
  await expect(row.getByText('In progress')).toBeVisible();

  await row.getByRole('button', { name: 'Edit' }).click();
  await dialog.getByLabel('Status').selectOption('DONE');
  await dialog.getByRole('button', { name: 'Save task' }).click();
  await expect(page.getByRole('row', { name: new RegExp(title) }).getByText('Done')).toBeVisible();

  page.once('dialog', (confirmation) => confirmation.accept());
  await page
    .getByRole('row', { name: new RegExp(title) })
    .getByRole('button', { name: 'Delete' })
    .click();
  await expect(page.getByRole('row', { name: new RegExp(title) })).toHaveCount(0);
});

test('the filter bar narrows the list through the URL', async ({ page }) => {
  await signIn(page, RECRUIT);
  await page.goto('/tasks');

  await page.getByLabel('Status').selectOption('DONE');
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page).toHaveURL(/status=DONE/);
  const statuses = await page.getByRole('row').getByText('Done').count();
  expect(statuses).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page).toHaveURL(/\/tasks$/);
});

test('a manager sees their reports’ tasks as read only', async ({ page }) => {
  await signIn(page, MANAGER);
  await page.goto('/tasks');

  await expect(page.getByText('Read only').first()).toBeVisible();
});

test('the table collapses to cards on a narrow viewport', async ({ page }) => {
  await signIn(page, RECRUIT);
  await page.setViewportSize({ width: 390, height: 780 });
  await page.goto('/tasks');

  await expect(page.getByRole('table')).toBeHidden();
  await expect(page.getByRole('listitem').first()).toBeVisible();
});
