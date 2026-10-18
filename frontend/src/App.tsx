import { Navigate, Route, Routes } from 'react-router-dom';
import { homePathFor, useAuth } from './auth/AuthContext';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import ProfilePage from './pages/ProfilePage';
import SignupPage from './pages/SignupPage';
import FeedbackFormPage from './pages/feedback/FeedbackFormPage';
import FeedbackListPage from './pages/feedback/FeedbackListPage';
import IssueFormPage from './pages/issues/IssueFormPage';
import IssuesPage from './pages/issues/IssuesPage';
import NoteFormPage from './pages/notes/NoteFormPage';
import NotesPage from './pages/notes/NotesPage';
import TaskFormPage from './pages/tasks/TaskFormPage';
import TasksPage from './pages/tasks/TasksPage';
import UserFormPage from './pages/admin/UserFormPage';
import UsersPage from './pages/admin/UsersPage';
import RecruitDetailPage from './pages/recruits/RecruitDetailPage';
import RecruitsPage from './pages/recruits/RecruitsPage';
import ReportsPage from './pages/reports/ReportsPage';

const RECRUIT_PAGES: [string, JSX.Element][] = [
  ['dashboard', <DashboardPage />],
  ['tasks', <TasksPage />],
  ['tasks/new', <TaskFormPage />],
  ['tasks/:id/edit', <TaskFormPage />],
  ['issues', <IssuesPage />],
  ['issues/new', <IssueFormPage />],
  ['issues/:id/edit', <IssueFormPage />],
  ['feedback', <FeedbackListPage />],
  ['feedback/new', <FeedbackFormPage />],
  ['feedback/:id/edit', <FeedbackFormPage />],
  ['notes', <NotesPage />],
  ['notes/new', <NoteFormPage />],
  ['notes/:id/edit', <NoteFormPage />],
];

const ADMIN_PAGES: [string, JSX.Element][] = [
  ['admin/users', <UsersPage />],
  ['admin/users/new', <UserFormPage />],
  ['admin/users/:id', <UserFormPage />],
];

function HomeRedirect() {
  const { user } = useAuth();
  return user ? <Navigate to={homePathFor(user)} replace /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<HomeRedirect />} />
        <Route path="profile" element={<ProfilePage />} />
        {RECRUIT_PAGES.map(([path, page]) => (
          <Route
            key={path}
            path={path}
            element={<RequireAuth roles={['RECRUIT']}>{page}</RequireAuth>}
          />
        ))}
        {ADMIN_PAGES.map(([path, page]) => (
          <Route
            key={path}
            path={path}
            element={<RequireAuth roles={['ADMIN']}>{page}</RequireAuth>}
          />
        ))}
        <Route
          path="recruits"
          element={<RequireAuth roles={['MANAGER', 'ADMIN']}><RecruitsPage /></RequireAuth>}
        />
        <Route
          path="recruits/:id"
          element={<RequireAuth roles={['MANAGER', 'ADMIN']}><RecruitDetailPage /></RequireAuth>}
        />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
