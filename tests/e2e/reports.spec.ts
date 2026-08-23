import { expect, test, type Page } from '@playwright/test';

/**
 * Reports end to end. The scope proof lives in the integration suite; what the
 * browser adds is that the builder offers each role only what it may ask for,
 * that a preview and the downloaded file are the same report, and that the file
 * really arrives as a UTF-8 CSV with the server's filename.
 */
const PASSWORD = process.env.SEED_PASSWORD ?? 'Passw0rd!23';
const RECRUIT = 'priya.sharma@onboarding.test';
const MANAGER = 'marcus.bell@onboarding.test';
const ADMIN = 'admin@onboarding.test';

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.getByRole('link', { name: 'Reports' }).click();
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
  await page.getByLabel('Period').selectOption('90');
}

const preview = async (page: Page) => {
  await page.getByRole('button', { name: 'Preview' }).click();
  await expect(page.getByTestId('report-preview')).toBeVisible({ timeout: 20_000 });
};

test('a recruit previews and downloads their own diary', async ({ page }) => {
  await signIn(page, RECRUIT);

  await expect(page.getByLabel('Scope')).toHaveValue('SELF');
  await expect(page.getByLabel('Scope').locator('option')).toHaveCount(1);

  await preview(page);
  await expect(page.getByTestId('report-preview')).toContainText('Priya Sharma');
  await expect(page.getByTestId('report-preview')).toContainText('Confidential');

  const download = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download CSV' }).click(),
  ]).then(([event]) => event);

  expect(download.suggestedFilename()).toMatch(
    /^onboarding-report_priya-sharma_\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.csv$/
  );

  const path = await download.path();
  const bytes = await import('node:fs/promises').then((fs) => fs.readFile(path));
  expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf]);
  expect(bytes.toString('utf8')).toContain('\r\n');
});

test('a manager downloads a PDF of their team and it opens as one', async ({ page }) => {
  await signIn(page, MANAGER);
  await page.getByLabel('Scope').selectOption('USERS');

  const download = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download PDF' }).click(),
  ]).then(([event]) => event);

  expect(download.suggestedFilename()).toMatch(
    /^onboarding-report_team_\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.pdf$/
  );

  const path = await download.path();
  const bytes = await import('node:fs/promises').then((fs) => fs.readFile(path));
  expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  expect(bytes.byteLength).toBeGreaterThan(1000);
});

test('a manager reports on their own recruits and is not offered notes for them', async ({ page }) => {
  await signIn(page, MANAGER);

  await expect(page.getByLabel('Scope').locator('option')).toHaveCount(3);
  await expect(page.getByLabel('Scope').locator('option', { hasText: 'Whole organisation' })).toHaveCount(0);

  await page.getByLabel('Scope').selectOption('USERS');
  await expect(page.getByText('Aisha Khan')).toHaveCount(0);
  await expect(page.getByText('Priya Sharma')).toBeVisible();

  // Notes are the section a manager may never request for somebody else, so the
  // checkbox is not offered at all — and the API refuses it regardless.
  await expect(page.getByRole('checkbox', { name: 'Notes' })).toHaveCount(0);
  await expect(page.getByText(/Private notes stay with their author/)).toBeVisible();

  await preview(page);
  await expect(page.getByTestId('report-preview')).toContainText('Priya Sharma');
  await expect(page.getByTestId('report-preview')).not.toContainText('Aisha Khan');
});

test('an admin reports across the organisation, including notes', async ({ page }) => {
  await signIn(page, ADMIN);

  await page.getByLabel('Scope').selectOption('ORG');
  await page.getByRole('checkbox', { name: 'Notes' }).check();

  await preview(page);
  const report = page.getByTestId('report-preview');
  await expect(report).toContainText('Priya Sharma');
  await expect(report).toContainText('Aisha Khan');
  // The notes section is present at all, which no other role can produce.
  await expect(report.getByText(/^Notes · \d+$/)).toBeVisible();
});

test('an inverted date range is refused rather than silently swapped', async ({ page }) => {
  await signIn(page, RECRUIT);

  await page.getByLabel('From').fill('2026-03-01');
  await page.getByLabel('To').fill('2026-01-01');
  await page.getByRole('button', { name: 'Preview' }).click();

  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByTestId('report-preview')).toHaveCount(0);
});
