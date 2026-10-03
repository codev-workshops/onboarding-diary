import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import type { User } from '../api/types';
import { fakeAuth, renderWithProviders } from '../test/renderWithProviders';
import { ProtectedRoute } from './ProtectedRoute';

const recruit: User = {
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

function guarded(roles?: ('MANAGER' | 'ADMIN')[]) {
  return (
    <Routes>
      <Route element={<ProtectedRoute roles={roles} />}>
        <Route path="*" element={<div>Secret content</div>} />
      </Route>
    </Routes>
  );
}

describe('ProtectedRoute', () => {
  it('redirects anonymous users to login', () => {
    renderWithProviders(guarded(), { route: '/secret', path: '/secret' });
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });

  it('renders content for an authenticated user', () => {
    const auth = fakeAuth({ status: 'authenticated', user: recruit });
    renderWithProviders(guarded(), { auth, route: '/secret', path: '/secret' });
    expect(screen.getByText('Secret content')).toBeInTheDocument();
  });

  it('forces a password change when required', () => {
    const auth = fakeAuth({
      status: 'authenticated',
      user: { ...recruit, mustChangePassword: true },
    });
    renderWithProviders(guarded(), { auth, route: '/secret', path: '/secret' });
    expect(screen.getByText('Change password page')).toBeInTheDocument();
  });

  it('sends users without the required role to the forbidden page', () => {
    const auth = fakeAuth({ status: 'authenticated', user: recruit, hasRole: () => false });
    renderWithProviders(guarded(['ADMIN']), { auth, route: '/secret', path: '/secret' });
    expect(screen.getByText('Forbidden page')).toBeInTheDocument();
  });
});
