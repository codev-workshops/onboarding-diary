import { expect, test } from '@playwright/test';
import { primaryNav, seeded, signIn } from './fixtures';

test('an admin creates a recruit, assigns a manager and promotes the account', async ({ page }) => {
  const email = `e2e-admin-managed-${Date.now()}@example.com`;

  await signIn(page, seeded.admin);
  await primaryNav(page).getByRole('link', { name: 'Users' }).click();
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();

  await page.getByRole('button', { name: 'New user' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Email').fill(email);
  await dialog.getByLabel('Initial password').fill('ManagedPass1');
  await dialog.getByLabel('Full name').fill('E2E Managed Recruit');
  await dialog.getByLabel('Role').selectOption('Recruit');
  await dialog.getByRole('button', { name: 'Save user' }).click();
  await expect(dialog).toBeHidden();

  const row = page.getByRole('row').filter({ hasText: email });
  await expect(row).toBeVisible();

  // Assign the seeded manager, then verify the row shows the new relationship.
  await row.getByRole('button', { name: 'Edit' }).click();
  await dialog.getByLabel('Manager').selectOption({ label: 'E2E Manager' });
  await dialog.getByRole('button', { name: 'Save user' }).click();
  await expect(dialog).toBeHidden();
  await expect(row.getByRole('cell').nth(4)).toHaveText('E2E Manager');

  // Change the role and verify the row reflects it; a manager keeps no manager of their own.
  await row.getByRole('button', { name: 'Edit' }).click();
  await dialog.getByLabel('Role').selectOption('Manager');
  await dialog.getByRole('button', { name: 'Save user' }).click();
  await expect(dialog).toBeHidden();
  await expect(row.getByRole('cell').nth(2)).toHaveText('Manager');
  await expect(row.getByRole('cell').nth(4)).toHaveText('—');
});
