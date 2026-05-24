import { Navigate, Outlet } from 'react-router-dom';
import type { Role } from '@onboarding-diary/shared';
import { useAuth } from '@/context/AuthContext';

interface RoleGuardProps {
  allowedRoles: Role[];
}

export function RoleGuard({ allowedRoles }: RoleGuardProps) {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
