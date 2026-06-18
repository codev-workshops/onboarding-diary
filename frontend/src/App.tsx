import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { LoginPage } from "./pages/LoginPage";
import { ProfilePage } from "./pages/ProfilePage";
import { TasksPage } from "./pages/TasksPage";
import { TaskDetailPage } from "./pages/TaskDetailPage";
import { TaskFormPage } from "./pages/TaskFormPage";
import { IssuesPage } from "./pages/IssuesPage";
import { IssueDetailPage } from "./pages/IssueDetailPage";
import { IssueFormPage } from "./pages/IssueFormPage";
import { FeedbackPage } from "./pages/FeedbackPage";
import { FeedbackDetailPage } from "./pages/FeedbackDetailPage";
import { FeedbackFormPage } from "./pages/FeedbackFormPage";
import { NotesPage } from "./pages/NotesPage";
import { NoteDetailPage } from "./pages/NoteDetailPage";
import { NoteFormPage } from "./pages/NoteFormPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SearchPage } from "./pages/SearchPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks"
            element={
              <ProtectedRoute>
                <TasksPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks/new"
            element={
              <ProtectedRoute>
                <TaskFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks/:id"
            element={
              <ProtectedRoute>
                <TaskDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasks/:id/edit"
            element={
              <ProtectedRoute>
                <TaskFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/issues"
            element={
              <ProtectedRoute>
                <IssuesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/issues/new"
            element={
              <ProtectedRoute>
                <IssueFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/issues/:id"
            element={
              <ProtectedRoute>
                <IssueDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/issues/:id/edit"
            element={
              <ProtectedRoute>
                <IssueFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/feedback"
            element={
              <ProtectedRoute>
                <FeedbackPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/feedback/new"
            element={
              <ProtectedRoute>
                <FeedbackFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/feedback/:id"
            element={
              <ProtectedRoute>
                <FeedbackDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/feedback/:id/edit"
            element={
              <ProtectedRoute>
                <FeedbackFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notes"
            element={
              <ProtectedRoute>
                <NotesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notes/new"
            element={
              <ProtectedRoute>
                <NoteFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notes/:id"
            element={
              <ProtectedRoute>
                <NoteDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notes/:id/edit"
            element={
              <ProtectedRoute>
                <NoteFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <SearchPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
