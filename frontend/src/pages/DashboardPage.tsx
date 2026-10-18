import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Dashboard } from '../api/entries';
import { useAuth } from '../auth/AuthContext';
import Alert from '../components/Alert';
import DashboardView from '../components/DashboardView';

export default function DashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<Dashboard>('/api/dashboard')
      .then(setDashboard)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load dashboard'));
  }, []);

  return (
    <>
      <div className="page-header">
        <h1>Welcome, {user?.name}</h1>
        <div className="actions quick-add">
          <Link className="btn btn-primary btn-small" to="/tasks/new">+ Task</Link>
          <Link className="btn btn-small" to="/issues/new">+ Issue</Link>
          <Link className="btn btn-small" to="/feedback/new">+ Feedback</Link>
          <Link className="btn btn-small" to="/notes/new">+ Note</Link>
        </div>
      </div>
      <Alert>{error}</Alert>
      {dashboard ? (
        <DashboardView dashboard={dashboard} linkTo={(path, id) => `/${path}/${id}/edit`} />
      ) : (
        !error && <p className="muted">Loading…</p>
      )}
    </>
  );
}
