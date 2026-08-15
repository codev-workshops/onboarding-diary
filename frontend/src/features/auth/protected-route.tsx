import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { EmptyState } from '../../shared/ui/states';
import type { UserRole } from '../../shared/types';
import { useAuth } from './auth-context';

export function ProtectedRoute({ roles }: { roles?: UserRole[] }) {
  const { isAuthenticated, hasRole } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !hasRole(roles)) {
    return <EmptyState title="Not authorised" description="Your role does not have access to this page." />;
  }

  return <Outlet />;
}
