import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AxiosError } from "axios";
import { dashboardApi } from "../api/dashboard";
import { TopBar } from "../components/TopBar";
import type { ActivityItem, ActivityType, ApiError, DashboardResponse } from "../api/types";

const ACTIVITY_PATH: Record<ActivityType, string> = {
  TASK: "/tasks",
  ISSUE: "/issues",
  FEEDBACK: "/feedback",
  NOTE: "/notes",
};

const ACTIVITY_LABEL: Record<ActivityType, string> = {
  TASK: "Task",
  ISSUE: "Issue",
  FEEDBACK: "Feedback",
  NOTE: "Note",
};

function activityLink(item: ActivityItem): string {
  return `${ACTIVITY_PATH[item.type]}/${item.id}`;
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await dashboardApi.get();
        if (!cancelled) setData(result);
      } catch (err) {
        const axiosError = err as AxiosError<ApiError>;
        if (!cancelled) setError(axiosError.response?.data?.message ?? "Unable to load dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const completionPct = data ? Math.round(data.taskMetrics.completionRate * 100) : 0;

  return (
    <div className="page">
      <TopBar />
      <main className="content">
        <h1>Dashboard</h1>

        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <p>Loading…</p>
        ) : data ? (
          <>
            <section className="card-grid" aria-label="Summary">
              <Link className="summary-card" to="/tasks">
                <span className="summary-value">{data.summary.tasks}</span>
                <span className="summary-label">Tasks</span>
              </Link>
              <Link className="summary-card" to="/issues">
                <span className="summary-value">{data.summary.issues}</span>
                <span className="summary-label">Issues</span>
              </Link>
              <Link className="summary-card" to="/feedback">
                <span className="summary-value">{data.summary.feedback}</span>
                <span className="summary-label">Feedback</span>
              </Link>
              <Link className="summary-card" to="/notes">
                <span className="summary-value">{data.summary.notes}</span>
                <span className="summary-label">Notes</span>
              </Link>
            </section>

            <div className="metrics-row">
              <section className="card metric-card" aria-label="Task completion">
                <h2>Task completion</h2>
                <p className="metric-headline" data-testid="completion-rate">
                  {completionPct}%
                </p>
                <p className="metric-sub">
                  {data.taskMetrics.completed} of {data.taskMetrics.total} done
                </p>
                <ul className="metric-breakdown">
                  {Object.entries(data.taskMetrics.byStatus).map(([status, count]) => (
                    <li key={status}>
                      <span>{status.replace(/_/g, " ")}</span>
                      <span>{count}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="card metric-card" aria-label="Open issues">
                <h2>Open issues</h2>
                <p className="metric-headline" data-testid="open-issues">
                  {data.issueMetrics.open}
                </p>
                <p className="metric-sub">of {data.issueMetrics.total} total</p>
                <ul className="metric-breakdown">
                  {Object.entries(data.issueMetrics.bySeverity).map(([severity, count]) => (
                    <li key={severity}>
                      <span>{severity}</span>
                      <span>{count}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            <section aria-label="Recent activity">
              <h2>Recent activity</h2>
              {data.recentActivity.length === 0 ? (
                <p className="empty">No recent activity.</p>
              ) : (
                <table className="task-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Title</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentActivity.map((item) => (
                      <tr key={`${item.type}-${item.id}`}>
                        <td>{item.date}</td>
                        <td>
                          <span className="badge">{ACTIVITY_LABEL[item.type]}</span>
                        </td>
                        <td>
                          <Link to={activityLink(item)}>{item.title}</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
