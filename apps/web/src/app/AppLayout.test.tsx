import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Role } from '@onboarding-diary/shared';
import { describe, expect, it } from 'vitest';

import { ADMIN, fakeClient, MANAGER, RECRUIT } from '../test/fakeClient.js';
import { renderWithProviders } from '../test/render.js';
import { AppLayout, visibleNavItems } from './AppLayout.js';

const labelsFor = (role: Role): string[] => visibleNavItems(role).map((item) => item.label);

describe('AppLayout navigation', () => {
  it('shows the team and admin destinations only to the roles that can use them', () => {
    expect(labelsFor('RECRUIT')).toEqual([
      'Dashboard',
      'Tasks',
      'Issues',
      'Feedback',
      'Notes',
      'Reports',
    ]);
    expect(labelsFor('MANAGER')).toContain('Team');
    expect(labelsFor('MANAGER')).not.toContain('Admin');
    expect(labelsFor('ADMIN')).toContain('Team');
    expect(labelsFor('ADMIN')).toContain('Admin');
  });

  it('renders the signed-in user and role-aware links', async () => {
    renderWithProviders(<AppLayout />, { client: fakeClient({ session: MANAGER }) });

    expect(await screen.findByRole('link', { name: /Marcus Lee/ })).toHaveAttribute(
      'href',
      '/profile',
    );
    expect(screen.getByRole('link', { name: 'Team' })).toBeVisible();
    expect(screen.queryByRole('link', { name: 'Admin' })).not.toBeInTheDocument();
  });

  it('offers admin navigation to an administrator', async () => {
    renderWithProviders(<AppLayout />, { client: fakeClient({ session: ADMIN }) });

    expect(await screen.findByRole('link', { name: 'Admin' })).toHaveAttribute('href', '/admin');
  });

  it('ends the session when the user logs out', async () => {
    const user = userEvent.setup();
    const client = fakeClient({ session: RECRUIT });
    renderWithProviders(<AppLayout />, { client });

    await user.click(await screen.findByRole('button', { name: 'Log out' }));

    await waitFor(() =>
      expect(client.post).toHaveBeenCalledWith('/auth/logout', undefined, {
        retryOnUnauthenticated: false,
      }),
    );
    expect(client.setAccessToken).toHaveBeenCalledWith(null);
    await waitFor(() =>
      expect(screen.queryByRole('link', { name: /Nadia Khan/ })).not.toBeInTheDocument(),
    );
  });
});
