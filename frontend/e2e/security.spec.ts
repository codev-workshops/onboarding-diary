import { expect, test } from '@playwright/test';
import { primaryNav, seeded, signIn, userIdOf } from './fixtures';

test.describe('out-of-scope routes stay closed', () => {
  test('a recruit cannot reach the admin route', async ({ page }) => {
    await signIn(page, seeded.assignedRecruit);

    await expect(primaryNav(page).getByRole('link', { name: 'Users' })).toHaveCount(0);

    await page.goto('/admin/users');

    await expect(page.getByRole('heading', { name: 'Users' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('a manager cannot open a recruit who is not assigned to them', async ({ page, request }) => {
    const unassigned = await userIdOf(request, seeded.unassignedRecruit);

    await signIn(page, seeded.manager);
    await page.goto(`/team/${unassigned}`);

    await expect(page.getByText('That recruit is not assigned to you.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'E2E Unassigned Recruit' })).toHaveCount(0);
  });
});
