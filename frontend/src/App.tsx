import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { lightTheme } from './theme/lightTheme';
import { darkTheme } from './theme/darkTheme';
import { useThemeStore } from './store/themeStore';
import { useAuthStore } from './store/authStore';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import IssuesPage from './pages/IssuesPage';
import FeedbackPage from './pages/FeedbackPage';
import NotesPage from './pages/NotesPage';
import ReportsPage from './pages/ReportsPage';
import ProfilePage from './pages/ProfilePage';
import AdminUsersPage from './pages/AdminUsersPage';
import NotFoundPage from './pages/NotFoundPage';

function App() {
  const mode = useThemeStore((s) => s.mode);
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <ThemeProvider theme={mode === 'dark' ? darkTheme : lightTheme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/issues" element={<IssuesPage />} />
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminUsersPage />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
