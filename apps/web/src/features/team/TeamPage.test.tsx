import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DIRECT_REPORTS } from '../../test/dashboardFixtures.js';
import { fakeClient, MANAGER } from '../../test/fakeClient.js';
import { renderWithProviders } from '../../test/render.js';
import { TeamPage } from './TeamPage.js';

describe('TeamPage', () => {
  it('renders one tile per direct report with progress, issues, and last activity', async () => {
    const client = fakeClient({
      session: MANAGER,
      handlers: {
        get: (path) => (path === '/users/me/direct-reports' ? { data: DIRECT_REPORTS } : undefined),
      },
    });
    renderWithProviders(<TeamPage />, { client, route: '/team' });

    const tiles = await screen.findAllByRole('listitem');
    expect(tiles).toHaveLength(2);

    expect(screen.getByRole('link', { name: 'Nadia Khan' })).toHaveAttribute(
      'href',
      `/team/${DIRECT_REPORTS[0]?.user.id ?? ''}`,
    );
    expect(
      screen.getByRole('progressbar', { name: 'Task completion for Nadia Khan' }),
    ).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText('5 of 10 done (50%)')).toBeVisible();
    expect(screen.getByText('None yet')).toBeVisible();
    expect(screen.getByText('2026-07-20')).toBeVisible();
  });

  it('explains the empty team state', async () => {
    const client = fakeClient({
      session: MANAGER,
      handlers: { get: (path) => (path === '/users/me/direct-reports' ? { data: [] } : undefined) },
    });
    renderWithProviders(<TeamPage />, { client, route: '/team' });

    expect(await screen.findByText('No direct reports yet')).toBeVisible();
  });
});
