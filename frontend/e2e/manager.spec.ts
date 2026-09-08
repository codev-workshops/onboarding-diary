import { expect, test } from '@playwright/test';
import { primaryNav, seeded, signIn } from './fixtures';

test('a manager opens an assigned recruit and gets a read-only diary', async ({ page }) => {
  await signIn(page, seeded.manager);

  await primaryNav(page).getByRole('link', { name: 'Team' }).click();
  await page.getByRole('link', { name: 'E2E Assigned Recruit' }).first().click();

  await expect(page.getByRole('heading', { name: 'E2E Assigned Recruit' })).toBeVisible();
  await expect(page.getByText('Read-only view.')).toBeVisible();

  await expect(page.getByText('Seeded onboarding task')).toBeVisible();

  for (const tab of ['Tasks', 'Issues', 'Feedback', 'Notes']) {
    await page.getByRole('tab', { name: tab }).click();
    await expect(page.getByRole('tabpanel')).toBeVisible();
    await expect(page.getByRole('button', { name: `New ${tab.toLowerCase()}` })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);
  }

  // Managers keep no diary of their own, so the recruit-only screens are not offered either.
  await expect(primaryNav(page).getByRole('link', { name: 'Tasks' })).toHaveCount(0);
});
