import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { UserRole } from '../api/auth';
import { useAuth } from './auth-context';

export function RequireAuth({ roles }: { roles?: UserRole[] }) {
  const { token, user, isLoading } = useAuth();
  const location = useLocation();

  if (token === null) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (isLoading || user === null) {
    return <p className="p-6 text-sm text-slate-600">Loading…</p>;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
