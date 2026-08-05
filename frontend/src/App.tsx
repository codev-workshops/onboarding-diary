import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import { RequireAuth } from './auth/RequireAuth';
import DashboardPage from './pages/DashboardPage';
import FeedbackPage from './pages/FeedbackPage';
import IssuesPage from './pages/IssuesPage';
import NotesPage from './pages/NotesPage';
import TasksPage from './pages/TasksPage';
import TeamPage from './pages/TeamPage';
import RecruitDiaryPage from './pages/RecruitDiaryPage';
import AdminUsersPage from './pages/AdminUsersPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import ReportsPage from './pages/ReportsPage';
import SearchPage from './pages/SearchPage';
import SignupPage from './pages/SignupPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/issues" element={<IssuesPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route element={<RequireAuth roles={['Manager', 'Admin']} />}>
            <Route path="/team" element={<TeamPage />} />
            <Route path="/team/:userId" element={<RecruitDiaryPage />} />
          </Route>
          <Route element={<RequireAuth roles={['Admin']} />}>
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
