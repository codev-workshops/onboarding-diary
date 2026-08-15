import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '../features/auth/login-page';
import { ProtectedRoute } from '../features/auth/protected-route';
import { SignupPage } from '../features/auth/signup-page';
import { DashboardPage } from '../features/dashboard/dashboard-page';
import { FeedbackPage } from '../features/feedback/feedback-page';
import { IssuesPage } from '../features/issues/issues-page';
import { AppLayout } from '../features/layout/app-layout';
import { NotesPage } from '../features/notes/notes-page';
import { ReportsPage } from '../features/reports/reports-page';
import { TasksPage } from '../features/tasks/tasks-page';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="issues" element={<IssuesPage />} />
          <Route path="feedback" element={<FeedbackPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
