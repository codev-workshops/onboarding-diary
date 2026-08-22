import { expect, test, type Page } from '@playwright/test';

/**
 * The dashboards end to end. The scope proof lives in the integration suite;
 * what the browser adds is that each role lands on the right page, that the
 * period is a shareable URL rather than hidden client state, and that a recruit
 * typing a manager's URL is refused by the server and not merely un-linked.
 */
const PASSWORD = process.env.SEED_PASSWORD ?? 'Passw0rd!23';
const RECRUIT = 'priya.sharma@onboarding.test';
const MANAGER = 'marcus.bell@onboarding.test';
const OTHER_MANAGER = 'dana.lee@onboarding.test';
const ADMIN = 'admin@onboarding.test';

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('a recruit lands on their own summary and can change the period', async ({ page }) => {
  await signIn(page, RECRUIT);

  await expect(page.getByRole('heading', { name: /Welcome, Priya/ })).toBeVisible();
  await expect(page.getByText('Open issues', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Recent activity', { exact: true }).first()).toBeVisible();

  const sevenDays = page.getByRole('link', { name: '7 days' });
  await expect(sevenDays).toBeVisible();
  await sevenDays.click();
  // A client-side transition under a loaded server: give the RSC round trip room.
  await expect(page).toHaveURL(/\/dashboard\?days=7$/, { timeout: 20_000 });
  await expect(page.getByText(/last 7 days/)).toBeVisible();
});

test('a recruit is refused the team and organisation views by the server', async ({ page }) => {
  await signIn(page, RECRUIT);

  await expect(page.getByRole('link', { name: 'Team' })).toHaveCount(0);

  await page.goto('/team');
  await expect(page.getByText(/not be found|404/i).first()).toBeVisible();

  await page.goto('/admin/overview');
  await expect(page.getByText(/not be found|404/i).first()).toBeVisible();
});

test('a manager sees their roster and can open a report, but not another manager’s', async ({ page }) => {
  await signIn(page, MANAGER);
  await page.getByRole('link', { name: 'Team' }).click();

  await expect(page.getByRole('heading', { name: 'Team', exact: true })).toBeVisible();
  const report = page.getByRole('link', { name: 'Priya Sharma' });
  await expect(report).toBeVisible();
  await expect(page.getByRole('link', { name: 'Aisha Khan' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Noah Silva' })).toHaveCount(0);

  await report.click();
  await expect(page.getByRole('heading', { name: 'Priya Sharma' })).toBeVisible();
  await expect(page.getByText(/Day \d+ of onboarding/)).toBeVisible();

  // A recruit addressed directly by id: same URL shape, and the answer is the
  // not-found screen rather than a summary.
  await page.goto('/team/00000000-0000-4000-8000-000000000000');
  await expect(page.getByText(/not be found|404/i).first()).toBeVisible();
});

test('a manager’s roster never renders a recruit’s private note', async ({ browser }) => {
  const title = `Playwright dashboard note ${Date.now()}`;

  const recruitContext = await browser.newContext();
  const recruitPage = await recruitContext.newPage();
  await signIn(recruitPage, RECRUIT);
  await recruitPage.goto('/notes');
  await recruitPage.getByRole('button', { name: 'New note' }).click();

  const dialog = recruitPage.getByRole('dialog');
  await dialog.getByLabel('Title').fill(title);
  await dialog.getByLabel('Content').fill('Something only the recruit should ever read.');
  await dialog.getByRole('button', { name: 'Save note' }).click();
  await expect(recruitPage.getByText(title).first()).toBeVisible();

  const managerContext = await browser.newContext();
  const managerPage = await managerContext.newPage();
  await signIn(managerPage, MANAGER);
  await managerPage.goto('/team');
  await managerPage.getByRole('link', { name: 'Priya Sharma' }).click();

  await expect(managerPage.getByRole('heading', { name: 'Priya Sharma' })).toBeVisible();
  await expect(managerPage.getByText(title)).toHaveCount(0);

  await recruitContext.close();
  await managerContext.close();
});

test('another manager’s roster excludes the first manager’s recruits', async ({ page }) => {
  await signIn(page, OTHER_MANAGER);
  await page.goto('/team');

  await expect(page.getByRole('link', { name: 'Aisha Khan' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Priya Sharma' })).toHaveCount(0);
});

test('an admin sees the organisation view, including recruits with no manager', async ({ page }) => {
  await signIn(page, ADMIN);
  await page.getByRole('link', { name: 'Organisation' }).click();

  await expect(page.getByRole('heading', { name: 'Organisation' })).toBeVisible();
  await expect(page.getByText('Departments', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Recruits without a manager', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Noah Silva' })).toBeVisible();
});
