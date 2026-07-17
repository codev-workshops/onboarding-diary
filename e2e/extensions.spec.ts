import { expect, test, type Page } from '@playwright/test';

const PASSWORD = 'Passw0rd!';

// Suppress the first-use Joyride tour so its spotlight overlay doesn't intercept clicks.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('onboarding.tour.done', 'true'));
});

async function loginAs(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
}

async function logout(page: Page) {
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login$/);
}

test('recruit sees the overdue reminder and badge for a seeded overdue task', async ({ page }) => {
  await loginAs(page, 'recruit.rina@demo.local');
  await expect(page).toHaveURL(/\/dashboard$/);

  // Seed includes a past-due, not-done task -> reminder callout + Overdue stat.
  await expect(page.getByRole('alert')).toContainText(/overdue/i);

  await page.getByRole('link', { name: 'Tasks' }).click();
  await expect(page.getByText('Overdue', { exact: true }).first()).toBeVisible();
});

test('manager sees an @mention activity indicator and can open it', async ({ page }) => {
  const stamp = Date.now();

  // A recruit posts a comment mentioning their manager.
  await loginAs(page, 'recruit.rina@demo.local');
  await page.getByRole('link', { name: 'Tasks' }).click();
  await page.getByRole('button', { name: /^Comments for/ }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Add a comment').fill(`E2E ping ${stamp} @manager.eng`);
  await dialog.getByRole('button', { name: /^Comment$/ }).click();
  await expect(dialog.getByText(`E2E ping ${stamp}`, { exact: false })).toBeVisible();
  // Close the comment modal so its overlay stops intercepting clicks.
  await dialog.getByRole('button', { name: /close/i }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await logout(page);

  // The mentioned manager sees an unread activity indicator.
  await loginAs(page, 'manager.eng@demo.local');
  const bell = page.getByRole('button', { name: /activity \(\d+ unread\)/i });
  await expect(bell).toBeVisible();
  await bell.click();
  await expect(page.getByRole('menu', { name: 'Recent mentions' })).toContainText(
    /mentioned you on/i,
  );
});

test('admin creates a checklist template and provisions a recruit with it', async ({ page }) => {
  const stamp = Date.now();
  const templateName = `E2E Template ${stamp}`;
  const recruitEmail = `e2e.recruit.${stamp}@demo.local`;
  const taskTitle = `E2E Checklist Task ${stamp}`;

  await loginAs(page, 'admin@demo.local');
  await expect(page).toHaveURL(/\/overview$/);
  await page.goto('/admin');

  // Create a template with one item.
  await page.locator('[data-tour="admin-tab-templates"]').click();
  await page.getByRole('button', { name: /new template/i }).click();
  const editor = page.getByRole('dialog');
  await editor.getByLabel('Name').fill(templateName);
  await editor.getByRole('button', { name: /add item/i }).click();
  await editor.getByLabel('Item 1 title').fill(taskTitle);
  await editor.getByRole('button', { name: /save template/i }).click();
  await expect(page.getByText(templateName)).toBeVisible();

  // Provision a recruit using the template.
  await page.locator('[data-tour="admin-tab-users"]').click();
  await page.getByLabel('Name').fill(`E2E Recruit ${stamp}`);
  await page.getByLabel('Email').fill(recruitEmail);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByLabel('Checklist template (optional)').selectOption({ label: `${templateName} (1 tasks)` });
  await page.getByRole('button', { name: /create user/i }).click();
  await expect(page.getByText(recruitEmail)).toBeVisible();
  await logout(page);

  // The new recruit's Task Log is seeded from the template.
  await loginAs(page, recruitEmail);
  await page.getByRole('link', { name: 'Tasks' }).click();
  await expect(page.getByText(taskTitle)).toBeVisible();
});
