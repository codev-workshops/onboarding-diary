import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Role } from '@onboarding-diary/shared';
import { AuthGuard } from '@/guards/AuthGuard';
import { RoleGuard } from '@/guards/RoleGuard';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { DashboardPage } from '@/pages/shared/DashboardPage';
import { TasksPage } from '@/pages/tasks/TasksPage';
import { IssuesPage } from '@/pages/issues/IssuesPage';
import { FeedbackPage } from '@/pages/feedback/FeedbackPage';
import { NotesPage } from '@/pages/notes/NotesPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { UsersPage } from '@/pages/admin/UsersPage';
import { AssignmentsPage } from '@/pages/admin/AssignmentsPage';
import { NotFoundPage } from '@/pages/shared/NotFoundPage';
import { SearchPage } from '@/pages/search/SearchPage';
import { AnalyticsPage } from '@/pages/analytics/AnalyticsPage';

export const router = createBrowserRouter([
  // Public routes
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },

  // Protected routes
  {
    element: <AuthGuard />,
    children: [
      { path: '/', element: <Navigate to="/dashboard" replace /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/tasks', element: <TasksPage /> },
      { path: '/issues', element: <IssuesPage /> },
      { path: '/feedback', element: <FeedbackPage /> },
      { path: '/notes', element: <NotesPage /> },
      { path: '/reports', element: <ReportsPage /> },
      { path: '/search', element: <SearchPage /> },
      { path: '/analytics', element: <AnalyticsPage /> },

      // Admin-only routes
      {
        element: <RoleGuard allowedRoles={[Role.ADMIN]} />,
        children: [
          { path: '/admin/users', element: <UsersPage /> },
          { path: '/admin/assignments', element: <AssignmentsPage /> },
        ],
      },
    ],
  },

  // Catch-all
  { path: '*', element: <NotFoundPage /> },
]);
