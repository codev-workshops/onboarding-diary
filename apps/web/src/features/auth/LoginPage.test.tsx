import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { ApiError } from '../../lib/apiClient.js';
import { fakeClient, RECRUIT } from '../../test/fakeClient.js';
import { renderWithProviders } from '../../test/render.js';
import { LoginPage } from './LoginPage.js';

function PathProbe(): ReactNode {
  return <output data-testid="path">{useLocation().pathname}</output>;
}

describe('LoginPage', () => {
  it('reports missing fields before calling the API', async () => {
    const user = userEvent.setup();
    const client = fakeClient();
    renderWithProviders(<LoginPage />, { client });

    await user.click(await screen.findByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Must be a valid email address')).toBeVisible();
    expect(screen.getByText('Password is required')).toBeVisible();
    expect(client.post).not.toHaveBeenCalled();
  });

  it('shows one generic message when the credentials are rejected', async () => {
    const user = userEvent.setup();
    const client = fakeClient();
    client.post.mockRejectedValue(
      new ApiError({ status: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' }),
    );
    renderWithProviders(<LoginPage />, { client });

    await user.type(await screen.findByLabelText(/Email/), 'nadia@example.com');
    await user.type(screen.getByLabelText(/Password/), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(
      await screen.findByText('That email and password combination is not correct.'),
    ).toBeVisible();
  });

  it('lands on the destination that sent the visitor to login', async () => {
    const user = userEvent.setup();
    const client = fakeClient();
    client.post.mockResolvedValue({
      data: { user: RECRUIT, accessToken: 'token', expiresIn: 900 },
    });

    renderWithProviders(
      <>
        <LoginPage />
        <PathProbe />
      </>,
      { client, route: '/login' },
    );

    await user.type(await screen.findByLabelText(/Email/), 'nadia@example.com');
    await user.type(screen.getByLabelText(/Password/), 'onboarding-demo-2026');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() =>
      expect(client.post).toHaveBeenCalledWith(
        '/auth/login',
        { email: 'nadia@example.com', password: 'onboarding-demo-2026' },
        { retryOnUnauthenticated: false },
      ),
    );
    await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/'));
  });
});
