import { useEffect, useState } from 'react';
import { getDashboardSummary } from '../api/dashboard';
import type { DashboardSummary } from '../api/types';
import BarChart from './BarChart';

/// Summary tiles, charts and recent activity for one recruit (own view or a manager's read-only view).
export default function DashboardView({ userId }: { userId?: string }) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboardSummary(userId)
      .then(setSummary)
      .catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : 'Failed to load dashboard'),
      );
  }, [userId]);

  if (error) return <p className="form-error">{error}</p>;
  if (!summary) return <p className="muted">Loading…</p>;

  const tiles = [
    { label: 'Tasks', value: summary.totalTasks },
    { label: 'Completed', value: summary.completedTasks },
    { label: 'Completion', value: `${summary.completionRate}%` },
    { label: 'Open issues', value: summary.openIssues },
    { label: 'Feedback', value: summary.feedbackCount },
    { label: 'Notes', value: summary.noteCount },
  ];

  return (
    <>
      <div className="tiles">
        {tiles.map((tile) => (
          <div key={tile.label} className="card tile">
            <span className="tile-value">{tile.value}</span>
            <span className="muted">{tile.label}</span>
          </div>
        ))}
      </div>

      <div className="charts">
        <BarChart title="Tasks by status" data={summary.tasksByStatus} />
        <BarChart title="Tasks by category" data={summary.tasksByCategory} />
        <BarChart title="Issues by severity" data={summary.issuesBySeverity} />
        <BarChart title="Entries per week" data={summary.activityByWeek} />
      </div>

      <div className="card">
        <h2>Recent activity</h2>
        {summary.recentActivity.length === 0 ? (
          <p className="muted">Nothing logged yet.</p>
        ) : (
          <ul className="entry-list plain">
            {summary.recentActivity.map((activity) => (
              <li key={`${activity.kind}-${activity.id}`}>
                <strong>{activity.title}</strong>
                <span className="muted">
                  {' '}
                  · {activity.kind} · {activity.date} · {activity.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
