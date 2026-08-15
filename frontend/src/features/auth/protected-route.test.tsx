import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/test-utils';
import { ProtectedRoute } from './protected-route';

describe('ProtectedRoute', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('redirects anonymous users to the login page', () => {
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<div>Login screen</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<div>Secret diary</div>} />
        </Route>
      </Routes>,
    );

    expect(screen.getByText('Login screen')).toBeInTheDocument();
    expect(screen.queryByText('Secret diary')).not.toBeInTheDocument();
  });

  it('blocks authenticated users without the required role', () => {
    localStorage.setItem('onboarding-diary.token', 'test-token');
    localStorage.setItem(
      'onboarding-diary.user',
      JSON.stringify({
        id: 1,
        email: 'recruit@onboarding.local',
        fullName: 'Rita Recruit',
        role: 'NewRecruit',
        startDate: '2026-01-01T00:00:00Z',
      }),
    );

    renderWithProviders(
      <Routes>
        <Route element={<ProtectedRoute roles={['Admin']} />}>
          <Route path="/" element={<div>Admin only</div>} />
        </Route>
      </Routes>,
    );

    expect(screen.queryByText('Admin only')).not.toBeInTheDocument();
    expect(screen.getByText(/not authorised/i)).toBeInTheDocument();
  });
});
