import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthGuard } from '@/guards/AuthGuard';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { DashboardPage } from '@/pages/shared/DashboardPage';
import { NotFoundPage } from '@/pages/shared/NotFoundPage';

export const router = createBrowserRouter([
  // Public routes
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },

  // Protected routes
  {
    element: <AuthGuard />,
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/', element: <Navigate to="/dashboard" replace /> },
    ],
  },

  // Catch-all
  { path: '*', element: <NotFoundPage /> },
]);
