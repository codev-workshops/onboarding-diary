import { expect, test, type Page } from '@playwright/test';

/**
 * The feedback and note slices end to end. The authorization proof lives in the
 * integration suite; what the browser adds is that the pages reach those
 * endpoints — and, for the rule that matters most here, that a recruit's
 * admin-only feedback and their notes never render for their manager.
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

test('a recruit shares, edits and deletes feedback', async ({ page }) => {
  const subject = `Playwright feedback ${Date.now()}`;

  await signIn(page, RECRUIT);
  await page.getByRole('link', { name: 'Feedback' }).click();
  await expect(page.getByRole('heading', { name: 'Feedback', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'New feedback' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Subject').fill(subject);
  await dialog.getByLabel('Details').fill('The buddy system removed most of the first-week guesswork.');
  await dialog.getByLabel('Type').selectOption('POSITIVE');
  await dialog.getByRole('button', { name: 'Save feedback' }).click();

  const card = page.getByRole('listitem').filter({ hasText: subject });
  await expect(card).toBeVisible();
  await expect(card.getByText('Positive')).toBeVisible();

  await card.getByRole('button', { name: 'Edit' }).click();
  await dialog.getByLabel('Type').selectOption('SUGGESTION');
  await dialog.getByRole('button', { name: 'Save feedback' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: subject }).getByText('Suggestion')).toBeVisible();

  page.once('dialog', (confirmation) => confirmation.accept());
  await page
    .getByRole('listitem')
    .filter({ hasText: subject })
    .getByRole('button', { name: 'Delete' })
    .click();
  await expect(page.getByRole('listitem').filter({ hasText: subject })).toHaveCount(0);
});

test('admin-only feedback stays out of the manager’s list', async ({ browser }) => {
  const subject = `Playwright private feedback ${Date.now()}`;

  const recruitContext = await browser.newContext();
  const recruitPage = await recruitContext.newPage();
  await signIn(recruitPage, RECRUIT);
  await recruitPage.goto('/feedback');

  await recruitPage.getByRole('button', { name: 'New feedback' }).click();
  const dialog = recruitPage.getByRole('dialog');
  await dialog.getByLabel('Subject').fill(subject);
  await dialog.getByLabel('Details').fill('Something I would rather my manager did not read.');
  await dialog.getByLabel('Type').selectOption('CONCERN');
  await dialog.getByLabel('Visible to').selectOption('ADMIN_ONLY');
  await dialog.getByRole('button', { name: 'Save feedback' }).click();
  await expect(recruitPage.getByRole('listitem').filter({ hasText: subject })).toBeVisible();

  const managerContext = await browser.newContext();
  const managerPage = await managerContext.newPage();
  await signIn(managerPage, MANAGER);
  await managerPage.goto('/feedback?page_size=100');
  await expect(managerPage.getByRole('heading', { name: 'Feedback', exact: true })).toBeVisible();
  await expect(managerPage.getByText(subject)).toHaveCount(0);

  await recruitContext.close();
  await managerContext.close();
});

test('a recruit writes a tagged note and filters by the tag', async ({ page }) => {
  const title = `Playwright note ${Date.now()}`;
  const tag = `pw${Date.now()}`;

  await signIn(page, RECRUIT);
  await page.getByRole('link', { name: 'Notes' }).click();
  await expect(page.getByRole('heading', { name: 'Notes', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'New note' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Title').fill(title);
  await dialog.getByLabel('Content').fill('The deployment runbooks live in the platform wiki.');
  await dialog.getByLabel('Tags').fill(`${tag}, Runbooks`);
  await dialog.getByRole('button', { name: 'Save note' }).click();

  const card = page.getByRole('listitem').filter({ hasText: title });
  await expect(card).toBeVisible();
  // Tags are normalised server-side, so the capitalised one comes back folded.
  await expect(card.getByText('runbooks', { exact: true })).toBeVisible();

  await page.getByLabel('Tag').fill(tag);
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page).toHaveURL(new RegExp(`tag=${tag}`));
  await expect(page.getByRole('listitem').filter({ hasText: title })).toBeVisible();

  page.once('dialog', (confirmation) => confirmation.accept());
  await page.getByRole('listitem').filter({ hasText: title }).getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: title })).toHaveCount(0);
});

test('a manager sees no notes but their own', async ({ page }) => {
  await signIn(page, MANAGER);
  await page.goto('/notes');

  await expect(page.getByRole('heading', { name: 'Notes', exact: true })).toBeVisible();
  // Whatever a manager's own note list holds, none of it belongs to a report.
  await expect(page.getByText('priya.sharma')).toHaveCount(0);
  await expect(page.getByText('Priya Sharma')).toHaveCount(0);
});
