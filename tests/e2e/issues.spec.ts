import { expect, test, type Page } from '@playwright/test';

/**
 * The issue slice end to end. The authorization proof lives in the integration
 * suite; what this adds is that the browser path reaches those endpoints — and
 * that a manager gets the triage form rather than the full editor.
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

test('a recruit logs, resolves and deletes an issue', async ({ page }) => {
  const title = `Playwright issue ${Date.now()}`;

  await signIn(page, RECRUIT);
  await page.getByRole('link', { name: 'Issues' }).click();
  await expect(page.getByRole('heading', { name: 'Issues', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'New issue' }).click();
  // Scoped to the dialog: the filter bar carries its own Status control.
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Title').fill(title);
  await dialog.getByLabel('Description').fill('Raised by the end-to-end suite as a blocker.');
  await dialog.getByLabel('Severity').selectOption('HIGH');
  await dialog.getByRole('button', { name: 'Save issue' }).click();

  const row = page.getByRole('row', { name: new RegExp(title) });
  await expect(row).toBeVisible();
  await expect(row.getByText('Open')).toBeVisible();

  await row.getByRole('button', { name: 'Edit' }).click();
  await dialog.getByLabel('Status').selectOption('RESOLVED');
  await dialog.getByLabel('Resolution notes').fill('IT granted the access on the same day.');
  await dialog.getByRole('button', { name: 'Save issue' }).click();
  await expect(page.getByRole('row', { name: new RegExp(title) }).getByText('Resolved')).toBeVisible();

  page.once('dialog', (confirmation) => confirmation.accept());
  await page
    .getByRole('row', { name: new RegExp(title) })
    .getByRole('button', { name: 'Delete' })
    .click();
  await expect(page.getByRole('row', { name: new RegExp(title) })).toHaveCount(0);
});

test('resolving without notes is refused with the error against the field', async ({ page }) => {
  const title = `Playwright unresolved ${Date.now()}`;

  await signIn(page, RECRUIT);
  await page.goto('/issues');

  await page.getByRole('button', { name: 'New issue' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Title').fill(title);
  await dialog.getByLabel('Description').fill('Closing this without saying how it was fixed.');
  await dialog.getByLabel('Status').selectOption('CLOSED');
  await dialog.getByRole('button', { name: 'Save issue' }).click();

  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('row', { name: new RegExp(title) })).toHaveCount(0);
});

test('the severity filter narrows the list through the URL', async ({ page }) => {
  await signIn(page, RECRUIT);
  await page.goto('/issues');

  await page.getByLabel('Severity').selectOption('HIGH');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page).toHaveURL(/severity=HIGH/);

  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page).toHaveURL(/\/issues$/);
});

test('a manager may triage a report’s issue but not rewrite it', async ({ page }) => {
  await signIn(page, MANAGER);
  await page.goto('/issues');

  await page.getByRole('button', { name: 'Update status' }).first().click();
  const dialog = page.getByRole('dialog');

  await expect(dialog.getByLabel('Status')).toBeVisible();
  await expect(dialog.getByLabel('Title')).toHaveCount(0);
  await expect(dialog.getByLabel('Severity')).toHaveCount(0);
});
