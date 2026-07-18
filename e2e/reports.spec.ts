import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { extractPdfText } from './pdfText';

const PASSWORD = 'Passw0rd!';

// The onboarding tour always runs in demo mode; skip it so its spotlight overlay
// doesn't intercept clicks (mirrors a real user dismissing the tour).
async function dismissTour(page: Page) {
  const skip = page.getByRole('button', { name: /skip/i });
  try {
    await skip.click({ timeout: 3000 });
  } catch {
    // Tour not shown; nothing to dismiss.
  }
}

async function loginAs(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'));
  await dismissTour(page);
}

// A range wide enough to include the (relative-dated) seeded demo entries.
async function generateWideReport(page: Page) {
  await page.goto('/reports');
  await dismissTour(page);
  await page.locator('#report-start').fill('2000-01-01');
  await page.locator('#report-end').fill('2100-12-31');
  await page.getByRole('button', { name: /generate report/i }).click();
  await expect(page.getByTestId('report-view')).toBeVisible();
}

test('exported PDF contains the report header, summary and on-screen entries', async ({ page }) => {
  await loginAs(page, 'recruit.rina@demo.local');
  await generateWideReport(page);

  // Capture a title actually shown on screen so we can prove it reaches the PDF.
  const view = page.getByTestId('report-view');
  const firstTaskTitle = (await view.locator('li span.font-medium').first().innerText()).trim();
  expect(firstTaskTitle.length).toBeGreaterThan(0);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /^PDF$/ }).click(),
  ]);
  expect(download.suggestedFilename()).toBe('onboarding-report.pdf');

  const path = await download.path();
  const pdf = readFileSync(path);
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');

  const text = extractPdfText(pdf);
  // Structure.
  expect(text).toContain('Onboarding Diary');
  expect(text).toContain('Summary');
  expect(text).toContain('Tasks (');
  expect(text).toContain('Issues (');
  expect(text).toContain('Feedback (');
  expect(text).toContain('Notes (');
  // The exact entry visible on screen is present in the document.
  expect(text).toContain(firstTaskTitle);
});
