import { defineConfig, devices } from '@playwright/test';

const apiPort = 5276;
const webPort = 4173;

/**
 * The suite drives one shared API, so the journeys run in sequence against a throwaway SQLite
 * file seeded by `E2E_SEED` (Development only). The recruit journey still registers through the
 * signup UI.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${webPort}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command:
        'rm -f data/e2e.db data/e2e.db-shm data/e2e.db-wal && dotnet run --project src/OnboardingDiary.Api',
      cwd: '../backend',
      url: `http://localhost:${apiPort}/healthz`,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 180_000,
      env: {
        ASPNETCORE_ENVIRONMENT: 'Development',
        ASPNETCORE_URLS: `http://localhost:${apiPort}`,
        E2E_SEED: 'true',
        Database__Path: '../../data/e2e.db',
        // The journeys sign in more often than a human would; the limiter is not under test.
        RateLimiting__LoginPermitLimit: '100',
        'Logging__LogLevel__Microsoft.EntityFrameworkCore': 'Warning',
      },
    },
    {
      command: `npm run build && npm run preview -- --port ${webPort} --strictPort`,
      url: `http://localhost:${webPort}`,
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
