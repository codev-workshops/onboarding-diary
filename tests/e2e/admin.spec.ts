import { expect, test, type Page } from '@playwright/test';

/**
 * Administration end to end. The rules are proved in the integration suite;
 * what the browser adds is that an admin can actually complete a lifecycle —
 * create a department, create a user in it, deactivate them — and that the
 * screens are refused to everyone else by the server rather than merely
 * hidden from the navigation.
 */
const PASSWORD = process.env.SEED_PASSWORD ?? 'Passw0rd!23';
const ADMIN = 'admin@onboarding.test';
const MANAGER = 'marcus.bell@onboarding.test';

async function signIn(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('a manager is refused the admin screens by the server', async ({ page }) => {
  await signIn(page, MANAGER);

  await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Departments' })).toHaveCount(0);

  await page.goto('/admin/users');
  await expect(page.getByText(/not be found|404/i).first()).toBeVisible();

  await page.goto('/admin/departments');
  await expect(page.getByText(/not be found|404/i).first()).toBeVisible();
});

test('an admin creates a department and a user in it, then deactivates them', async ({ page }) => {
  const suffix = Date.now().toString().slice(-6);
  const department = `E2E Dept ${suffix}`;
  const email = `e2e.user.${suffix}@onboarding.test`;

  await signIn(page, ADMIN);

  await page.getByRole('link', { name: 'Departments' }).click();
  await expect(page.getByRole('heading', { name: 'Departments' })).toBeVisible();

  await page.getByRole('button', { name: 'New department' }).click();
  await page.getByLabel('Name').fill(department);
  await page.getByRole('button', { name: 'Save department' }).click();
  await expect(page.getByRole('cell', { name: department })).toBeVisible();

  await page.getByRole('link', { name: 'Users' }).click();
  await page.getByRole('button', { name: 'New user' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Full name').fill(`E2E User ${suffix}`);
  await page.getByLabel('Start date').fill('2026-03-02');
  await page.getByLabel('Department').selectOption({ label: department });
  await page.getByLabel('Manager').selectOption({ label: 'Marcus Bell' });
  await page.getByRole('button', { name: 'Create user' }).click();

  // The temporary password is shown once and only once.
  await expect(page.getByRole('heading', { name: 'User created' })).toBeVisible();
  await page.getByRole('button', { name: 'Done' }).click();

  const row = page.getByRole('row', { name: new RegExp(email) });
  await expect(row).toBeVisible();
  await expect(row).toContainText(department);
  await expect(row).toContainText('Marcus Bell');

  await row.getByRole('button', { name: 'Deactivate' }).click();
  await expect(row).toContainText('Deactivated');

  // A department with a member cannot be deleted, only deactivated.
  await page.getByRole('link', { name: 'Departments' }).click();
  const departmentRow = page.getByRole('row', { name: new RegExp(department) });
  await expect(departmentRow.getByRole('button', { name: 'Delete' })).toHaveCount(0);
});

test('an admin-created account can only reach the change-password screen', async ({ page }) => {
  const suffix = Date.now().toString().slice(-6);
  const email = `e2e.temp.${suffix}@onboarding.test`;

  await signIn(page, ADMIN);
  await page.getByRole('link', { name: 'Users' }).click();
  await page.getByRole('button', { name: 'New user' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Full name').fill(`E2E Temp ${suffix}`);
  await page.getByLabel('Start date').fill('2026-03-02');
  await page.getByRole('button', { name: 'Create user' }).click();

  await expect(page.getByRole('heading', { name: 'User created' })).toBeVisible();
  const temporary = await page.locator('code').first().textContent();
  expect(temporary).toBeTruthy();
  await page.getByRole('button', { name: 'Done' }).click();

  await page.goto('/signed-out');
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(temporary as string);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/change-password$/);

  // The diary itself stays out of reach until the temporary password is gone.
  await page.goto('/tasks');
  await expect(page).toHaveURL(/\/change-password$/);

  await page.getByLabel('Temporary password').fill(temporary as string);
  await page.getByLabel('New password').fill('ChosenPass1');
  await page.getByRole('button', { name: 'Save password' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
});

test('the last active admin cannot deactivate themselves', async ({ page }) => {
  await signIn(page, ADMIN);
  await page.getByRole('link', { name: 'Users' }).click();

  const row = page.getByRole('row', { name: /admin@onboarding\.test/ });
  await row.getByRole('button', { name: 'Deactivate' }).click();

  await expect(page.getByText(/last active admin/i)).toBeVisible();
  await expect(row).not.toContainText('Deactivated');
});
