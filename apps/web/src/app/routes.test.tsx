import { screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { fakeClient, RECRUIT } from '../test/fakeClient.js';
import { renderWithProviders } from '../test/render.js';
import { AppRoutes } from './routes.js';

function LocationProbe(): ReactNode {
  const location = useLocation();
  return <output data-testid="location">{JSON.stringify(location.state)}</output>;
}

describe('AppRoutes', () => {
  it('renders the shell with its navigation for an authenticated recruit', async () => {
    renderWithProviders(<AppRoutes />, { client: fakeClient({ session: RECRUIT }) });

    await waitFor(() => expect(screen.getByRole('navigation', { name: 'Main' })).toBeVisible());
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('heading', { name: 'Welcome, Nadia' })).toBeVisible();
  });

  it('renders the 404 page for an unknown path', async () => {
    renderWithProviders(<AppRoutes />, {
      client: fakeClient({ session: RECRUIT }),
      route: '/nope',
    });

    await waitFor(() => expect(screen.getByText('Page not found')).toBeVisible());
  });

  it('sends an anonymous visitor to login, preserving the intended destination', async () => {
    renderWithProviders(
      <>
        <AppRoutes />
        <LocationProbe />
      </>,
      { client: fakeClient(), route: '/tasks?status=DONE' },
    );

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Log in' })).toBeVisible());
    expect(JSON.parse(screen.getByTestId('location').textContent ?? 'null')).toEqual({
      from: '/tasks?status=DONE',
    });
  });

  it('shows access denied instead of redirecting when the role is insufficient', async () => {
    renderWithProviders(<AppRoutes />, {
      client: fakeClient({ session: RECRUIT }),
      route: '/admin',
    });

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'You do not have access to this' })).toBeVisible(),
    );
    expect(screen.queryByRole('heading', { name: 'Log in' })).not.toBeInTheDocument();
  });

  it('admits a manager to the team route', async () => {
    renderWithProviders(<AppRoutes />, {
      client: fakeClient({ session: { ...RECRUIT, role: 'MANAGER' } }),
      route: '/team',
    });

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Your team' })).toBeVisible());
  });
});
