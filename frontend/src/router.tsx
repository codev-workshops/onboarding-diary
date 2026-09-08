import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { NotFoundPage } from './components/NotFoundPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { FeedbackPage } from './features/feedback/FeedbackPage';
import { IssuesPage } from './features/issues/IssuesPage';
import { NotesPage } from './features/notes/NotesPage';
import { ReportsPage } from './features/reports/ReportsPage';
import { TasksPage } from './features/tasks/TasksPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'issues', element: <IssuesPage /> },
      { path: 'feedback', element: <FeedbackPage /> },
      { path: 'notes', element: <NotesPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
