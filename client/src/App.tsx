import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { Layout } from '@/components/Layout';
import { LoadingState } from '@/components/states';
import { Tour } from '@/onboarding/Tour';
import { AdminPage } from '@/pages/AdminPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { FeedbackPage } from '@/pages/FeedbackPage';
import { IssuesPage } from '@/pages/IssuesPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotesPage } from '@/pages/NotesPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { TasksPage } from '@/pages/TasksPage';

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

  return (
    <>
      <Tour />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/issues" element={<IssuesPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          {user.role === 'Admin' ? <Route path="/admin" element={<AdminPage />} /> : null}
        </Route>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
