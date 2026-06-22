import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import EntriesPage from './pages/EntriesPage';
import EntryDetailPage from './pages/EntryDetailPage';
import EntryFormPage from './pages/EntryFormPage';
import SettingsPage from './pages/SettingsPage';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/entries" replace />} />
            <Route path="/entries" element={<EntriesPage />} />
            <Route path="/entries/new" element={<EntryFormPage />} />
            <Route path="/entries/:id" element={<EntryDetailPage />} />
            <Route path="/entries/:id/edit" element={<EntryFormPage />} />
            <Route path="/settings/social" element={<SettingsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
