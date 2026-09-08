import type { APIRequestContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';

/** Mirrors `E2eSeeder` on the backend — the accounts a journey cannot create for itself. */
export const seeded = {
  password: 'E2ePassword!1',
  admin: 'e2e-admin@example.com',
  manager: 'e2e-manager@example.com',
  assignedRecruit: 'e2e-assigned@example.com',
  unassignedRecruit: 'e2e-unassigned@example.com',
} as const;

export const apiBaseURL = 'http://localhost:5276';

/** The sidebar, so a journey does not match the same label rendered in page copy. */
export const primaryNav = (page: Page) => page.getByRole('navigation', { name: 'Primary' });

export async function signIn(page: Page, email: string, password = seeded.password) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
}

/** Looks a fixture user up through the admin API — ids depend on seed order, emails do not. */
export async function userIdOf(request: APIRequestContext, email: string): Promise<number> {
  const login = await request.post(`${apiBaseURL}/api/v1/auth/login`, {
    data: { email: seeded.admin, password: seeded.password },
  });
  expect(login.ok()).toBeTruthy();
  const { accessToken } = (await login.json()) as { accessToken: string };

  const users = await request.get(
    `${apiBaseURL}/api/v1/admin/users?q=${encodeURIComponent(email)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  expect(users.ok()).toBeTruthy();
  const body = (await users.json()) as { items: { id: number; email: string }[] };
  const match = body.items.find((user) => user.email === email);

  if (match === undefined) {
    throw new Error(`Fixture user ${email} is missing — is E2E_SEED enabled?`);
  }

  return match.id;
}
