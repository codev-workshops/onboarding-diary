import { expect, test, type Page } from '@playwright/test';

const PASSWORD = 'Passw0rd!';
const ADMIN = 'admin@demo.local';
// A seeded recruit who owns onboarding entries and is overseen by a manager, so
// deactivating them exercises the "keep the content, block the login" path.
const RECRUIT_EMAIL = 'recruit.rina@demo.local';
const RECRUIT_NAME = 'Rina Recruit';
const MANAGER_EMAIL = 'manager.eng@demo.local';

// The onboarding tour always runs in demo mode; skip it so its spotlight overlay
// doesn't intercept clicks (mirrors a real user dismissing the tour).
async function dismissTour(page: Page) {
  const skip = page.getByRole('button', { name: /skip/i });
  try {
    await skip.click({ timeout: 3000 });
  } catch {
    // Tour not shown; nothing to dismiss.
  }
}

async function loginAs(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'));
  await dismissTour(page);
}

async function logout(page: Page) {
  await page.getByRole('button', { name: /log out/i }).click();
  await page.waitForURL((url) => url.pathname.endsWith('/login'));
}

test('deactivating a user blocks login while their content stays with a visible cue', async ({
  page,
}) => {
  // 1. An admin deactivates the recruit from Admin > Users.
  await loginAs(page, ADMIN);
  await page.goto('/admin');
  await dismissTour(page);
  const userRow = page.locator('li', { hasText: RECRUIT_NAME }).first();
  await expect(userRow).toBeVisible();
  await userRow.getByRole('button', { name: `Deactivate ${RECRUIT_NAME}` }).click();
  await page.getByRole('button', { name: /^Deactivate$/ }).click();

  // The user remains listed, now flagged with a visible "Deactivated" cue.
  const deactivatedRow = page.locator('li', { hasText: RECRUIT_NAME }).first();
  await expect(deactivatedRow).toContainText(RECRUIT_NAME);
  await expect(deactivatedRow.getByText('Deactivated')).toBeVisible();
  await logout(page);

  // 2. Their manager still sees the recruit and their onboarding progress on the
  //    Team page (content is retained), shown with the deactivated cue.
  await loginAs(page, MANAGER_EMAIL);
  const teamCard = page.locator('div', { hasText: RECRUIT_NAME }).first();
  await expect(page.getByText(RECRUIT_NAME).first()).toBeVisible();
  await expect(teamCard.getByText('Deactivated').first()).toBeVisible();
  await logout(page);

  // 3. The deactivated recruit can no longer sign in (generic error, stays on login).
  await page.goto('/login');
  await page.getByLabel('Email').fill(RECRUIT_EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByRole('alert')).toContainText(/invalid/i);
  await expect(page).toHaveURL(/\/login$/);

  // 4. Reactivation restores login — and leaves the shared demo DB as we found
  //    it, so a retry starts from a clean state.
  await loginAs(page, ADMIN);
  await page.goto('/admin');
  await dismissTour(page);
  const restoreRow = page.locator('li', { hasText: RECRUIT_NAME }).first();
  await restoreRow.getByRole('button', { name: `Reactivate ${RECRUIT_NAME}` }).click();
  await expect(restoreRow.getByText('Deactivated')).toHaveCount(0);
  await logout(page);

  await loginAs(page, RECRUIT_EMAIL);
  await expect(page).not.toHaveURL(/\/login$/);
});
