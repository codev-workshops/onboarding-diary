import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AuditLogPage } from './pages/admin/AuditLogPage';
import { RecruitDetailPage } from './pages/manager/RecruitDetailPage';
import { TeamPage } from './pages/manager/TeamPage';
import { ReportsPage } from './pages/ReportsPage';
import { SearchPage } from './pages/SearchPage';
import { ChecklistsPage } from './pages/ChecklistsPage';
import { ChecklistTemplatesPage } from './pages/admin/ChecklistTemplatesPage';
import { AppShell } from './components/AppShell';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { FeedbackPage } from './pages/diary/FeedbackPage';
import { IssuesPage } from './pages/diary/IssuesPage';
import { NotesPage } from './pages/diary/NotesPage';
import { TasksPage } from './pages/diary/TasksPage';
import { ForbiddenPage } from './pages/ForbiddenPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProfilePage } from './pages/ProfilePage';
import { SignupPage } from './pages/SignupPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/issues" element={<IssuesPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/checklists" element={<ChecklistsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route element={<ProtectedRoute roles={['MANAGER', 'ADMIN']} />}>
            <Route path="/team" element={<TeamPage />} />
            <Route path="/team/:recruitId" element={<RecruitDetailPage />} />
            <Route path="/team/:recruitId/:tab" element={<RecruitDetailPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/audit-log" element={<AuditLogPage />} />
            <Route path="/admin/checklists" element={<ChecklistTemplatesPage />} />
          </Route>
          <Route path="/forbidden" element={<ForbiddenPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
