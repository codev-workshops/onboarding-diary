import { defineConfig } from '@playwright/test';
import path from 'path';

const timestamp = process.env.REGRESSION_TIMESTAMP || new Date().toISOString().replace(/[:.]/g, '-');
const artifactsDir = path.resolve(__dirname, '..', 'artifacts', 'regression', timestamp);

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  outputDir: path.join(artifactsDir, 'playwright-results'),
  reporter: [
    ['html', { outputFolder: path.join(artifactsDir, 'playwright-report'), open: 'never' }],
    ['list'],
    ['json', { outputFile: path.join(artifactsDir, 'playwright-results.json') }],
  ],
  use: {
    baseURL: process.env.FRONTEND_URL || 'http://localhost:3000',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
    headless: true,
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
