import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { getDashboard, statusLabels } from '../../api/tasks';
import { useAuth } from '../../auth/auth-context';

export function DashboardPage() {
  const { user } = useAuth();
  const isRecruit = user?.role === 'Recruit';

  const query = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => getDashboard(),
    enabled: isRecruit,
  });

  if (!isRecruit) {
    return (
      <section className="space-y-2">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-600">
          Signed in as {user?.role}. Roster and organisation views arrive with the manager and admin
          milestone.
        </p>
      </section>
    );
  }

  if (query.isPending) {
    return <p className="text-sm text-slate-600">Loading dashboard…</p>;
  }

  if (query.isError) {
    return (
      <div role="alert" className="space-y-2 text-sm text-red-600">
        <p>
          {query.error instanceof ApiError
            ? query.error.message
            : 'Could not load the dashboard. Try again.'}
        </p>
        <button
          type="button"
          className="rounded-md border border-slate-300 px-3 py-1 text-slate-700"
          onClick={() => void query.refetch()}
        >
          Retry
        </button>
      </div>
    );
  }

  const { tasks, issues, feedbackCount, noteCount, recentTasks, recentActivity } = query.data;
  const openBySeverity = Object.entries(issues.openBySeverity).filter(([, count]) => count > 0);

  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tasks logged" value={tasks.total} />
        <StatCard label="Completed" value={tasks.done} />
        <StatCard label="Open" value={tasks.open} />
        <StatCard label="Completion" value={`${tasks.completionPercentage}%`} />
        <StatCard label="Open issues" value={issues.open} />
        <StatCard label="Issues logged" value={issues.total} />
        <StatCard label="Feedback" value={feedbackCount} />
        <StatCard label="Notes" value={noteCount} />
      </div>

      <div>
        <h2 className="text-lg font-semibold">Open issues by severity</h2>
        {openBySeverity.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">No open issues.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {openBySeverity.map(([severity, count]) => (
              <li
                key={severity}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700"
              >
                {severity}: {count}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold">Recent tasks</h2>
        {recentTasks.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
            <p>Nothing logged yet.</p>
            <Link className="mt-2 inline-block font-medium text-slate-900 underline" to="/tasks">
              Log your first task
            </Link>
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {recentTasks.map((task) => (
              <li key={task.id} className="flex flex-wrap justify-between gap-2 p-3 text-sm">
                <span className="font-medium">{task.title}</span>
                <span className="text-slate-600">
                  {task.entryDate} · {statusLabels[task.status]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold">Recent activity</h2>
        {recentActivity.length === 0 ? (
          <p className="mt-2 text-sm text-slate-600">Nothing logged yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {recentActivity.map((item) => (
              <li
                key={`${item.kind}-${item.id}`}
                className="flex flex-wrap justify-between gap-2 p-3 text-sm"
              >
                <span>
                  <span className="mr-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {item.kind}
                  </span>
                  <span className="font-medium">{item.title}</span>
                </span>
                <span className="text-slate-600">
                  {item.entryDate} · {item.detail}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
