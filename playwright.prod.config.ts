import { defineConfig, devices } from '@playwright/test';

const CI = !!process.env.CI;

/**
 * PRODUCTION e2e config. Unlike the demo suite (SQLite + pre-seeded demo org), the
 * `serve.ts` webServer boots a real PostgreSQL container, performs the
 * demo→production cutover via the setup-tool core, then starts the API in
 * production mode against it. The browser specs then drive the *UI-driven*
 * organization setup (departments, managers, recruits) and re-run the core UX flows
 * to prove parity on PostgreSQL (docs/TESTING_STRATEGY.md).
 */
export default defineConfig({
  testDir: './e2e-prod',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  workers: 1,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // Boots Postgres + cutover + API (production mode); see e2e-prod/serve.ts.
      command: 'tsx e2e-prod/serve.ts',
      port: 4000,
      reuseExistingServer: false,
      timeout: 240_000,
    },
    {
      command: 'npm --workspace client run dev',
      port: 5173,
      reuseExistingServer: !CI,
      timeout: 120_000,
    },
  ],
});
