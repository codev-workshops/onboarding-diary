import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import type { User } from '../api/types';
import { fakeAuth, renderWithProviders } from '../test/renderWithProviders';
import { LoginPage } from './LoginPage';

const user: User = {
  id: 1,
  email: 'asha@example.com',
  roles: ['RECRUIT'],
  mustChangePassword: false,
  profile: {
    fullName: 'Asha Recruit',
    jobTitle: null,
    department: 'Engineering',
    startDate: '2026-09-21',
    managerId: null,
    managerEmail: null,
  },
};

describe('LoginPage', () => {
  it('shows validation errors when submitted empty', async () => {
    const auth = fakeAuth();
    renderWithProviders(<LoginPage />, { auth, route: '/login', path: '/login' });

    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('logs in and navigates to the dashboard', async () => {
    const auth = fakeAuth({ login: vi.fn().mockResolvedValue(user) });
    renderWithProviders(<LoginPage />, { auth, route: '/login', path: '/login' });

    await userEvent.type(screen.getByLabelText('Email'), 'asha@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Secret123');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => expect(auth.login).toHaveBeenCalledWith('asha@example.com', 'Secret123'));
    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
  });

  it('redirects to change password when a temporary password was used', async () => {
    const auth = fakeAuth({
      login: vi.fn().mockResolvedValue({ ...user, mustChangePassword: true }),
    });
    renderWithProviders(<LoginPage />, { auth, route: '/login', path: '/login' });

    await userEvent.type(screen.getByLabelText('Email'), 'asha@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Temp1234');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Change password page')).toBeInTheDocument();
  });

  it('shows the server error message on failure', async () => {
    const error = new AxiosError('Unauthorized', '401', undefined, undefined, {
      status: 401,
      statusText: 'Unauthorized',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data: { detail: 'Invalid email or password' },
    });
    const auth = fakeAuth({ login: vi.fn().mockRejectedValue(error) });
    renderWithProviders(<LoginPage />, { auth, route: '/login', path: '/login' });

    await userEvent.type(screen.getByLabelText('Email'), 'asha@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Wrong1234');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });
});
