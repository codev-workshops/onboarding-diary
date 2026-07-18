import { defineConfig, devices } from '@playwright/test';

const CI = !!process.env.CI;

/**
 * E2E config: boots the API (with a freshly seeded demo database) and the Vite
 * dev server (which proxies /api to the API), then runs browser tests.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: 1,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command:
        'npm --workspace server run prisma:push && npm --workspace server run seed && npm --workspace server run dev',
      port: 4000,
      reuseExistingServer: !CI,
      timeout: 180_000,
      env: {
        // No DB_STRING ⇒ demo mode (SQLite) with the seeded demo org (§13).
        DATABASE_URL: 'file:./e2e.db',
        JWT_SECRET: 'e2e-secret',
        PORT: '4000',
        CORS_ORIGIN: 'http://localhost:5173',
      },
    },
    {
      command: 'npm --workspace client run dev',
      port: 5173,
      reuseExistingServer: !CI,
      timeout: 120_000,
    },
  ],
});
