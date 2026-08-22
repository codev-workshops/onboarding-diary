import { expect, test } from '@playwright/test';

import { prisma } from '@/src/shared/db/prisma';

/**
 * End-to-end auth smoke tests against the seeded database. They use the demo
 * accounts documented in the README; all seeded users share one password.
 */
const PASSWORD = process.env.SEED_PASSWORD ?? 'Passw0rd!23';
const RECRUIT = 'priya.sharma@onboarding.test';
const MANAGER = 'marcus.bell@onboarding.test';
const ADMIN = 'admin@onboarding.test';

async function signIn(page: import('@playwright/test').Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('an anonymous visitor is redirected from a protected route and returned to it after signing in', async ({
  page,
}) => {
  await page.goto('/reports');
  await expect(page).toHaveURL('/login?next=%2Freports');

  await page.getByLabel('Email').fill(RECRUIT);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/reports$/);
});

test('a recruit signs in, sees only their own navigation, and signs out', async ({ page }) => {
  await signIn(page, RECRUIT);

  await expect(page.getByRole('heading', { name: /Welcome, Priya Sharma/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Team' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0);

  // S2: the session lives only in an HttpOnly cookie.
  const sessionCookie = (await page.context().cookies()).find((cookie) => cookie.name === 'od_session');
  expect(sessionCookie?.httpOnly).toBe(true);
  expect(sessionCookie?.sameSite).toBe('Lax');
  expect(await page.evaluate(() => JSON.stringify(window.localStorage))).toBe('{}');

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard$/);
});

test('a manager sees Team but not Users, and is 404ed out of the admin page', async ({ page }) => {
  await signIn(page, MANAGER);

  await expect(page.getByRole('link', { name: 'Team' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0);

  // Hiding the link is not the control: the server refuses the route too.
  const response = await page.goto('/admin/users');
  expect(response?.status()).toBe(404);
});

test('an admin sees the full navigation', async ({ page }) => {
  await signIn(page, ADMIN);

  await expect(page.getByRole('link', { name: 'Team' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Users' })).toBeVisible();
});

test('wrong credentials fail with a generic message and no session', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(RECRUIT);
  await page.getByLabel('Password').fill('DefinitelyWr0ng');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('main').getByRole('alert')).toHaveText('Email or password is incorrect.');
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.context().cookies()).some((cookie) => cookie.name === 'od_session')).toBe(false);
});

test('signup creates a recruit and lands on the dashboard', async ({ page }) => {
  const email = `e2e-${Date.now()}@onboarding.test`;

  await page.goto('/signup');
  await page.getByLabel('Full name').fill('End To End');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Onboard1ngDiary');
  await page.getByLabel('Start date').fill('2026-03-02');
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('banner').getByText('RECRUIT')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0);
});

test('a session that no longer resolves to an active user is cleared, not bounced in a loop', async ({
  page,
}) => {
  const email = `e2e-deactivated-${Date.now()}@onboarding.test`;

  await page.goto('/signup');
  await page.getByLabel('Full name').fill('Deactivated Soon');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Onboard1ngDiary');
  await page.getByLabel('Start date').fill('2026-03-02');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await prisma.user.update({ where: { email }, data: { isActive: false } });

  // The cookie is still signature-valid, so middleware alone would keep sending
  // this back to /dashboard; the visit must instead land on /login for good.
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.context().cookies()).find((cookie) => cookie.name === 'od_session')?.value).toBeFalsy();

  await page.goto('/login');
  await expect(page).toHaveURL(/\/login$/);
});

test('the auth API enforces authentication on /auth/me', async ({ request }) => {
  const anonymous = await request.get('/api/v1/auth/me');
  expect(anonymous.status()).toBe(401);
  expect((await anonymous.json()).error.code).toBe('UNAUTHENTICATED');

  const login = await request.post('/api/v1/auth/login', {
    data: { email: ADMIN, password: PASSWORD },
  });
  expect(login.status()).toBe(200);

  // A production build marks the cookie Secure, which the API request context
  // will not replay over plain http, so it is echoed back by hand here.
  const setCookie = login.headers()['set-cookie'] ?? '';
  expect(setCookie).toContain('HttpOnly');
  const cookie = setCookie.split(';')[0];

  const me = await request.get('/api/v1/auth/me', { headers: { cookie } });
  const body = await me.json();
  expect(me.status()).toBe(200);
  expect(body.data.user.role).toBe('ADMIN');
  expect(body.data.permissions.can_manage_users).toBe(true);
  expect(JSON.stringify(body)).not.toContain('passwordHash');

  const loggedOut = await request.post('/api/v1/auth/logout', { headers: { cookie }, data: {} });
  expect(loggedOut.status()).toBe(204);
  expect(loggedOut.headers()['set-cookie']).toContain('Max-Age=0');
});
