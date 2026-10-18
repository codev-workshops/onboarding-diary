import { Navigate, Route, Routes } from 'react-router-dom';
import { homePathFor, useAuth } from './auth/AuthContext';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import ProfilePage from './pages/ProfilePage';
import SignupPage from './pages/SignupPage';

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
        <Route
          path="dashboard"
          element={
            <RequireAuth roles={['RECRUIT']}>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
