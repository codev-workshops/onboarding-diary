import { Page, expect } from '@playwright/test';

const API_BASE = process.env.API_BASE_URL || 'https://localhost:7030';

export interface TestUser {
  email: string;
  password: string;
  name: string;
  department: string;
  accessToken?: string;
  refreshToken?: string;
  userId?: string;
}

export function generateEmail(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export async function apiRegister(page: Page, user: Partial<TestUser> & { email: string; password: string }): Promise<TestUser> {
  const res = await page.request.post(`${API_BASE}/api/auth/register`, {
    data: {
      email: user.email,
      password: user.password,
      name: user.name || 'Test User',
      department: user.department || 'Engineering',
      startDate: new Date().toISOString(),
    },
    ignoreHTTPSErrors: true,
  });
  const body = await res.json();
  return {
    email: user.email,
    password: user.password,
    name: user.name || 'Test User',
    department: user.department || 'Engineering',
    userId: body.userId,
  };
}

export async function apiLogin(page: Page, email: string, password: string): Promise<{ accessToken: string; refreshToken: string; userId: string }> {
  const res = await page.request.post(`${API_BASE}/api/auth/login`, {
    data: { email, password },
    ignoreHTTPSErrors: true,
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  return {
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    userId: body.user.id,
  };
}

export async function loginViaUI(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /log\s*in|sign\s*in/i }).click();
  // Wait for navigation away from login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
}

export async function logoutViaUI(page: Page): Promise<void> {
  // Try common logout button patterns
  const logoutBtn = page.getByRole('button', { name: /log\s*out|sign\s*out/i });
  if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await logoutBtn.click();
  } else {
    // Try menu-based logout
    const userMenu = page.locator('[data-testid="user-menu"], button:has-text("Menu"), [aria-label*="menu"]').first();
    if (await userMenu.isVisible({ timeout: 2000 }).catch(() => false)) {
      await userMenu.click();
      await page.getByRole('menuitem', { name: /log\s*out/i }).click();
    }
  }
}
