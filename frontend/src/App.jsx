import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Dashboard from './pages/Dashboard';
import TaskListPage from './pages/TaskListPage';
import TaskFormPage from './pages/TaskFormPage';
import IssueListPage from './pages/IssueListPage';
import IssueFormPage from './pages/IssueFormPage';
import FeedbackListPage from './pages/FeedbackListPage';
import FeedbackFormPage from './pages/FeedbackFormPage';
import NoteListPage from './pages/NoteListPage';
import NoteFormPage from './pages/NoteFormPage';
import ReportPage from './pages/ReportPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminAssignmentsPage from './pages/AdminAssignmentsPage';
import RecruitDetailPage from './pages/RecruitDetailPage';
import './App.css';

export default function App() {
  const { loading } = useAuth();

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/tasks" element={<ProtectedRoute><TaskListPage /></ProtectedRoute>} />
          <Route path="/tasks/new" element={<ProtectedRoute roles={['RECRUIT']}><TaskFormPage /></ProtectedRoute>} />
          <Route path="/tasks/:id/edit" element={<ProtectedRoute roles={['RECRUIT']}><TaskFormPage /></ProtectedRoute>} />
          <Route path="/issues" element={<ProtectedRoute><IssueListPage /></ProtectedRoute>} />
          <Route path="/issues/new" element={<ProtectedRoute roles={['RECRUIT']}><IssueFormPage /></ProtectedRoute>} />
          <Route path="/issues/:id/edit" element={<ProtectedRoute roles={['RECRUIT']}><IssueFormPage /></ProtectedRoute>} />
          <Route path="/feedback" element={<ProtectedRoute><FeedbackListPage /></ProtectedRoute>} />
          <Route path="/feedback/new" element={<ProtectedRoute roles={['RECRUIT']}><FeedbackFormPage /></ProtectedRoute>} />
          <Route path="/feedback/:id/edit" element={<ProtectedRoute roles={['RECRUIT']}><FeedbackFormPage /></ProtectedRoute>} />
          <Route path="/notes" element={<ProtectedRoute><NoteListPage /></ProtectedRoute>} />
          <Route path="/notes/new" element={<ProtectedRoute roles={['RECRUIT']}><NoteFormPage /></ProtectedRoute>} />
          <Route path="/notes/:id/edit" element={<ProtectedRoute roles={['RECRUIT']}><NoteFormPage /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute roles={['MANAGER', 'ADMIN']}><ReportPage /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute roles={['ADMIN']}><AdminUsersPage /></ProtectedRoute>} />
          <Route path="/admin/assignments" element={<ProtectedRoute roles={['ADMIN']}><AdminAssignmentsPage /></ProtectedRoute>} />
          <Route path="/recruits/:recruitId" element={<ProtectedRoute roles={['MANAGER', 'ADMIN']}><RecruitDetailPage /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}
