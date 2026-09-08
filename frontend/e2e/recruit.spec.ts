import { expect, test } from '@playwright/test';
import { primaryNav } from './fixtures';

/** Reads the number a dashboard stat card shows next to its label. */
const statValue = (page: import('@playwright/test').Page, label: string) =>
  page.getByText(label, { exact: true }).locator('xpath=following-sibling::p');

test('a recruit registers, logs a task, sees the dashboard update, resolves an issue and downloads a report', async ({
  page,
}) => {
  const email = `e2e-journey-${Date.now()}@example.com`;

  await page.goto('/signup');
  await page.getByLabel('Full name').fill('E2E Journey Recruit');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('JourneyPass1');
  await page.getByLabel('Department').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(statValue(page, 'Tasks logged')).toHaveText('0');

  await primaryNav(page).getByRole('link', { name: 'Tasks' }).click();
  await page.getByRole('button', { name: 'New task' }).click();

  const taskDialog = page.getByRole('dialog');
  await taskDialog.getByLabel('Title').fill('Complete security induction');
  await taskDialog
    .getByLabel('Description')
    .fill('Watched the induction videos and signed the policy.');
  await taskDialog.getByRole('button', { name: 'Save task' }).click();

  await expect(taskDialog).toBeHidden();
  await expect(
    page.getByRole('cell', { name: 'Complete security induction', exact: true })
  ).toBeVisible();

  await primaryNav(page).getByRole('link', { name: 'Dashboard' }).click();
  await expect(statValue(page, 'Tasks logged')).toHaveText('1');
  await expect(
    page.getByText('Complete security induction', { exact: true }).first()
  ).toBeVisible();

  await primaryNav(page).getByRole('link', { name: 'Issues' }).click();
  await page.getByRole('button', { name: 'New issue' }).click();

  const issueDialog = page.getByRole('dialog');
  await issueDialog.getByLabel('Title').fill('Laptop missing VPN access');
  await issueDialog
    .getByLabel('Description')
    .fill('Cannot reach internal services from the new laptop.');
  await issueDialog.getByLabel('Severity').selectOption('High');
  await issueDialog.getByRole('button', { name: 'Save issue' }).click();

  await expect(issueDialog).toBeHidden();
  await expect(page.getByText('Laptop missing VPN access', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Edit' }).click();
  await issueDialog.getByLabel('Status').selectOption('Resolved');
  await issueDialog
    .getByLabel('Resolution notes')
    .fill('IT installed the VPN client and access works.');
  await issueDialog.getByRole('button', { name: 'Save issue' }).click();

  await expect(issueDialog).toBeHidden();
  await expect(
    page.getByText('Resolution: IT installed the VPN client and access works.')
  ).toBeVisible();

  await primaryNav(page).getByRole('link', { name: 'Reports' }).click();
  await expect(page.getByRole('heading', { name: 'E2E Journey Recruit' })).toBeVisible();

  const [pdf] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download PDF' }).click(),
  ]);

  expect(pdf.suggestedFilename()).toMatch(/\.pdf$/);
  expect(await pdf.failure()).toBeNull();
});
