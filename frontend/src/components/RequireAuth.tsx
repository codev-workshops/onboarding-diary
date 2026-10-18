import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import type { Role } from '../api/types';
import ForbiddenPage from '../pages/ForbiddenPage';

interface Props {
  roles?: Role[];
  children: ReactNode;
}

export default function RequireAuth({ roles, children }: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return <div className="page-loading">Loading…</div>;
  }
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (roles && !roles.includes(user.role)) {
    return <ForbiddenPage />;
  }
  return <>{children}</>;
}
