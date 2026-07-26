import type { ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';

import { AdminDashboardPage } from '../features/admin/AdminDashboardPage.js';
import { AdminUsersPage } from '../features/admin/AdminUsersPage.js';
import { LoginPage } from '../features/auth/LoginPage.js';
import { SignupPage } from '../features/auth/SignupPage.js';
import { DashboardPage } from '../features/dashboard/DashboardPage.js';
import { FeedbackPage } from '../features/feedback/FeedbackPage.js';
import { IssuesPage } from '../features/issues/IssuesPage.js';
import { NotesPage } from '../features/notes/NotesPage.js';
import { ProfilePage } from '../features/profile/ProfilePage.js';
import { ReportsPage } from '../features/reports/ReportsPage.js';
import { TasksPage } from '../features/tasks/TasksPage.js';
import { RecruitDetailPage } from '../features/team/RecruitDetailPage.js';
import { TeamPage } from '../features/team/TeamPage.js';
import { AppLayout } from './AppLayout.js';
import { NotFoundPage } from './NotFoundPage.js';
import { RequireAuth, RequireRole } from './RequireAuth.js';

export function AppRoutes(): ReactNode {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="issues" element={<IssuesPage />} />
          <Route path="feedback" element={<FeedbackPage />} />
          <Route path="notes" element={<NotesPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route element={<RequireRole allow={['MANAGER', 'ADMIN']} />}>
            <Route path="team" element={<TeamPage />} />
            <Route path="team/:userId" element={<RecruitDetailPage />} />
          </Route>
          <Route element={<RequireRole allow={['ADMIN']} />}>
            <Route path="admin" element={<AdminDashboardPage />} />
            <Route path="admin/users" element={<AdminUsersPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
