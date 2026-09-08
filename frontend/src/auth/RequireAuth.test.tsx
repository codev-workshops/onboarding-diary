import { screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { renderWithProviders } from '../test/renderWithProviders';
import { RequireAuth } from './RequireAuth';

const profile = {
  id: 1,
  email: 'recruit@example.com',
  fullName: 'Rae Recruit',
  role: 'Recruit',
  departmentId: null,
  departmentName: null,
  startDate: '2026-01-05',
};

function renderGuard(roles?: ('Recruit' | 'Manager' | 'Admin')[]) {
  renderWithProviders(
    <Routes>
      <Route element={<RequireAuth roles={roles} />}>
        <Route path="/admin" element={<p>Admin area</p>} />
      </Route>
      <Route path="/login" element={<p>Sign in</p>} />
      <Route path="/" element={<p>Dashboard</p>} />
    </Routes>,
    { route: '/admin' }
  );
}

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => sessionStorage.clear());

test('redirects to the login page when there is no token', () => {
  renderGuard();

  expect(screen.getByText('Sign in')).toBeInTheDocument();
});

test('renders the protected route for an authenticated user', async () => {
  sessionStorage.setItem('onboarding-diary.access-token', 'token-123');
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(profile), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  );

  renderGuard();

  expect(await screen.findByText('Admin area')).toBeInTheDocument();
});

test('redirects away when the role is not allowed', async () => {
  sessionStorage.setItem('onboarding-diary.access-token', 'token-123');
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(profile), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  );

  renderGuard(['Admin']);

  await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
});
