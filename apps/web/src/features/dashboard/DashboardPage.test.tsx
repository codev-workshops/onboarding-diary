import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { dashboardFixture, EMPTY_DASHBOARD } from '../../test/dashboardFixtures.js';
import { fakeClient, RECRUIT } from '../../test/fakeClient.js';
import { renderWithProviders } from '../../test/render.js';
import { DashboardPage } from './DashboardPage.js';

function render(dashboard: unknown) {
  const client = fakeClient({
    session: RECRUIT,
    handlers: { get: (path) => (path === '/dashboard' ? { data: dashboard } : undefined) },
  });
  renderWithProviders(<DashboardPage />, { client });
  return client;
}

describe('DashboardPage', () => {
  it('shows the counts, task progress, open issues, and recent activity', async () => {
    render(dashboardFixture());

    expect(await screen.findByText('5 of 7 done (71%)')).toBeVisible();
    expect(screen.getByRole('progressbar', { name: 'Task completion' })).toHaveAttribute(
      'aria-valuenow',
      '71',
    );
    expect(screen.getByRole('heading', { name: /Open issues/ })).toBeVisible();
    expect(screen.getByText('High:')).toBeVisible();
    expect(screen.getByText('Set up the laptop')).toBeVisible();
  });

  it('invites a brand new recruit to make their first entry', async () => {
    render(EMPTY_DASHBOARD);

    expect(await screen.findByText('Your diary is empty')).toBeVisible();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
