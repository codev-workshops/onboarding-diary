import { expect, test, type Page } from '@playwright/test';
import { PROD_ADMIN } from './constants.js';

/**
 * Production UX parity suite (PostgreSQL). The demo suite (e2e/) relies on a
 * pre-seeded demo organization; production starts empty, so this suite first
 * performs the organization setup *through the UI* (departments, a manager, a
 * recruit) and then re-runs the core UX flows against PostgreSQL
 * (docs/TESTING_STRATEGY.md). Tests are serial and share the org they build.
 */

const PASSWORD = 'Sup3rSecret!';
const DEPARTMENT = 'Engineering';
const MANAGER = { name: 'Morgan Manager', email: 'manager1@acme.example' };
const RECRUIT = { name: 'Riley Recruit', email: 'recruit1@acme.example' };

async function login(page: Page, email: string, password: string) {
  // Clear any prior session so an authenticated user isn't redirected away from
  // /login (the suite switches roles within a single browser context).
  await page.goto('/login');
  await page.evaluate(() => localStorage.clear());
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
}

test.describe.serial('production (PostgreSQL) UX', () => {
  test('login page hides demo credentials and rejects demo accounts', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText(/pre-provisioned accounts/i)).toHaveCount(0);

    // The seeded demo admin must not exist / must not authenticate in production.
    await page.getByLabel('Email').fill('admin@demo.local');
    await page.getByLabel('Password').fill('Passw0rd!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByRole('alert')).toContainText(/invalid/i);
  });

  test('admin sets up the organization via the UI (department, manager, recruit)', async ({
    page,
  }) => {
    await login(page, PROD_ADMIN.email, PROD_ADMIN.password);
    await expect(page.getByRole('heading', { name: 'Organization overview' })).toBeVisible();

    await page.goto('/admin');

    // Department.
    await page.locator('[data-tour="admin-tab-departments"]').click();
    await page.getByPlaceholder('Department name').fill(DEPARTMENT);
    await page.getByRole('button', { name: /^add$/i }).click();
    await expect(page.getByText(DEPARTMENT)).toBeVisible();

    // Manager.
    await page.locator('[data-tour="admin-tab-users"]').click();
    await createUser(page, { ...MANAGER, role: 'Manager', department: DEPARTMENT });
    await expect(page.getByText(MANAGER.email, { exact: false })).toBeVisible();

    // Recruit reporting to the manager.
    await createUser(page, {
      ...RECRUIT,
      role: 'Recruit',
      department: DEPARTMENT,
      manager: MANAGER.name,
    });
    await expect(page.getByText(RECRUIT.email, { exact: false })).toBeVisible();
  });

  test('role redirects and RBAC hold on PostgreSQL', async ({ page }) => {
    await login(page, MANAGER.email, PASSWORD);
    await expect(page).toHaveURL(/\/team$/);
    await expect(page.getByRole('heading', { name: 'Team' })).toBeVisible();
    await expect(page.getByText(RECRUIT.name)).toBeVisible();

    await login(page, RECRUIT.email, PASSWORD);
    await expect(page).toHaveURL(/\/dashboard$/);
    for (const route of ['/team', '/overview', '/admin']) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/dashboard$/);
    }
  });

  test('recruit and admin can create tasks on PostgreSQL', async ({ page }) => {
    const recruitTask = `Prod recruit task ${Date.now()}`;
    await login(page, RECRUIT.email, PASSWORD);
    await page.getByRole('link', { name: 'Tasks' }).click();
    await expect(page.getByRole('heading', { name: 'Task Log' })).toBeVisible();
    await page.getByRole('button', { name: /new task/i }).click();
    await page.getByLabel('Title').fill(recruitTask);
    await page.getByLabel('Description').fill('Created against PostgreSQL by an e2e test.');
    await page.getByRole('button', { name: /^save$/i }).click();
    await expect(page.getByText(recruitTask)).toBeVisible();

    const adminTask = `Prod admin task ${Date.now()}`;
    await login(page, PROD_ADMIN.email, PROD_ADMIN.password);
    await page.getByRole('link', { name: 'Tasks' }).click();
    await page.getByRole('button', { name: /new task/i }).click();
    await page.getByLabel('Title').fill(adminTask);
    await page.getByLabel('Description').fill('Admin task on PostgreSQL.');
    await page.getByRole('button', { name: /^save$/i }).click();
    await expect(page.getByText(adminTask)).toBeVisible();
  });
});

async function createUser(
  page: Page,
  opts: { name: string; email: string; role: string; department?: string; manager?: string },
) {
  // Scope to the create-user form's field ids; the users list reuses labels like
  // "Manager" in edit/delete aria-labels.
  await page.locator('#u-name').fill(opts.name);
  await page.locator('#u-email').fill(opts.email);
  await page.locator('#u-password').fill(PASSWORD);
  await page.locator('#u-role').selectOption(opts.role);
  if (opts.department) {
    await page.locator('#u-dept').selectOption({ label: opts.department });
  }
  if (opts.manager) {
    await page.locator('#u-manager').selectOption({ label: opts.manager });
  }
  await page.getByRole('button', { name: /create user/i }).click();
}
