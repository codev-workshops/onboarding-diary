import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { Layout } from '@/components/Layout';
import { LoadingState } from '@/components/states';
import type { Role } from '@/lib/constants';
import { landingPathFor } from '@/lib/roles';
import { Tour } from '@/onboarding/Tour';
import { AdminPage } from '@/pages/AdminPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { FeedbackPage } from '@/pages/FeedbackPage';
import { IssuesPage } from '@/pages/IssuesPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotesPage } from '@/pages/NotesPage';
import { OverviewPage } from '@/pages/OverviewPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { TasksPage } from '@/pages/TasksPage';
import { TeamPage } from '@/pages/TeamPage';

export function App() {
  const { user, loading } = useAuth();

  if (loading) return <LoadingState label="Loading Onboarding Diary…" />;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const home = landingPathFor(user.role);

  // Restricts a route to a single role, redirecting others to their own landing.
  const requireRole = (role: Role, element: ReactElement): ReactElement =>
    user.role === role ? element : <Navigate to={home} replace />;

  return (
    <>
      <Tour />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={requireRole('Recruit', <DashboardPage />)} />
          <Route path="/team" element={requireRole('Manager', <TeamPage />)} />
          <Route path="/overview" element={requireRole('Admin', <OverviewPage />)} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/issues" element={<IssuesPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          {user.role === 'Admin' ? <Route path="/admin" element={<AdminPage />} /> : null}
        </Route>
        <Route path="/login" element={<Navigate to={home} replace />} />
        <Route path="*" element={<Navigate to={home} replace />} />
      </Routes>
    </>
  );
}
