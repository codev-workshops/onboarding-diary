import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { renderWithProviders } from '../../test/renderWithProviders';
import { LoginPage } from './LoginPage';

const profile = {
  id: 1,
  email: 'recruit@example.com',
  fullName: 'Rae Recruit',
  role: 'Recruit',
  departmentId: null,
  departmentName: null,
  startDate: '2026-01-05',
};

function renderLogin() {
  renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<p>Dashboard</p>} />
    </Routes>,
    { route: '/login' }
  );
}

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => sessionStorage.clear());

test('signs in, stores the token and redirects', async () => {
  const user = userEvent.setup();
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = String(input);
    const body = url.endsWith('/auth/login')
      ? { accessToken: 'token-123', expiresAt: '2026-01-05T12:00:00Z', user: profile }
      : profile;
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
  });

  renderLogin();

  await user.type(screen.getByLabelText('Email'), 'recruit@example.com');
  await user.type(screen.getByLabelText('Password'), 'Password123');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));

  expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  expect(sessionStorage.getItem('onboarding-diary.access-token')).toBe('token-123');

  const meCall = fetchMock.mock.calls.find(([input]) => String(input).endsWith('/me'));
  expect(meCall).toBeDefined();
  const headers = new Headers(meCall?.[1]?.headers);
  expect(headers.get('Authorization')).toBe('Bearer token-123');
});

test('shows the problem detail when the credentials are rejected', async () => {
  const user = userEvent.setup();
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({ title: 'Unauthorized', status: 401, detail: 'Invalid email or password.' }),
      { status: 401, headers: { 'content-type': 'application/problem+json' } }
    )
  );

  renderLogin();

  await user.type(screen.getByLabelText('Email'), 'recruit@example.com');
  await user.type(screen.getByLabelText('Password'), 'wrong-password');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));

  await waitFor(() =>
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email or password.')
  );
});

test('validates the email before calling the API', async () => {
  const user = userEvent.setup();
  const fetchMock = vi.spyOn(globalThis, 'fetch');

  renderLogin();

  await user.type(screen.getByLabelText('Email'), 'not-an-email');
  await user.type(screen.getByLabelText('Password'), 'Password123');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Enter a valid email address.');
  expect(fetchMock).not.toHaveBeenCalled();
});
