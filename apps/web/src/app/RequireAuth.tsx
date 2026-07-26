/**
 * Route guards (T-113). Unauthenticated visitors are redirected to login with the intended
 * destination preserved; an authenticated user with the wrong role sees an access-denied
 * screen rather than being bounced around a redirect loop (TRD 6.4).
 */

import type { Role } from '@onboarding-diary/shared';
import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../features/auth/AuthContext.js';
import { AccessDeniedPage } from './AccessDeniedPage.js';
import { FullPageSpinner } from '../components/ui/FullPageSpinner.js';

export function RequireAuth(): ReactNode {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageSpinner label="Restoring your session" />;
  if (status === 'anonymous') {
    const from = `${location.pathname}${location.search}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }
  return <Outlet />;
}

export function RequireRole({ allow }: { allow: readonly Role[] }): ReactNode {
  const { status, user } = useAuth();

  if (status === 'loading') return <FullPageSpinner label="Restoring your session" />;
  if (user === null || !allow.includes(user.role)) return <AccessDeniedPage />;
  return <Outlet />;
}
