import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ADMIN_DASHBOARD } from '../../test/dashboardFixtures.js';
import { ADMIN, fakeClient, RECRUIT } from '../../test/fakeClient.js';
import { renderWithProviders } from '../../test/render.js';
import { AppRoutes } from '../../app/routes.js';
import { AdminDashboardPage } from './AdminDashboardPage.js';

describe('AdminDashboardPage', () => {
  it('reports organisation-wide totals and links to user management', async () => {
    const client = fakeClient({
      session: ADMIN,
      handlers: {
        get: (path) => (path === '/dashboard/admin' ? { data: ADMIN_DASHBOARD } : undefined),
      },
    });
    renderWithProviders(<AdminDashboardPage />, { client, route: '/admin' });

    expect(await screen.findByText('9')).toBeVisible();
    expect(screen.getByText('8 active, 1 deactivated')).toBeVisible();
    expect(screen.getByText('24 of 40 done (60%)')).toBeVisible();
    expect(screen.getByText('5 open issues across all recruits.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Manage users' })).toHaveAttribute(
      'href',
      '/admin/users',
    );
  });

  it('is closed to a recruit', async () => {
    renderWithProviders(<AppRoutes />, {
      client: fakeClient({ session: RECRUIT }),
      route: '/admin',
    });

    expect(
      await screen.findByRole('heading', { name: 'You do not have access to this' }),
    ).toBeVisible();
  });
});
