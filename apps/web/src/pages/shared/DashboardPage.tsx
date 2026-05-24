import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Role } from '@onboarding-diary/shared';
import { PageLayout } from '@/components/layout/PageLayout';
import { useAuth } from '@/context/AuthContext';
import { dashboardApi } from '@/api/dashboard.api';
import { analyticsApi } from '@/api/analytics.api';
import { Card, CardContent, StatCard } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { PageLoading } from '@/components/ui/LoadingSpinner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { TaskCompletionChart } from '@/components/charts/TaskCompletionChart';
import { RecruitActivityChart } from '@/components/charts/RecruitActivityChart';

function RecruitDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'recruit'],
    queryFn: dashboardApi.getRecruitDashboard,
  });

  if (isLoading || !data) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Tasks" value={data.task_stats.total} />
        <StatCard
          label="Completion Rate"
          value={`${data.task_stats.completion_rate}%`}
          subtext={`${data.task_stats.by_status.find((s) => s.status === 'COMPLETED')?.count ?? 0} completed`}
        />
        <StatCard label="Open Issues" value={data.issue_summary.open + data.issue_summary.in_progress} />
        <StatCard
          label="Activity Streak"
          value={`${data.streak.current_days} days`}
        />
      </div>

      {data.task_stats.overdue > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">
            You have {data.task_stats.overdue} overdue task{data.task_stats.overdue > 1 ? 's' : ''}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <RecentList title="Recent Tasks" entries={data.recent_tasks} />
        <RecentList title="Recent Issues" entries={data.recent_issues} />
        <RecentList title="Recent Notes" entries={data.recent_notes} />
      </div>

      <DashboardAnalyticsSummary />
    </div>
  );
}

function ManagerDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'manager'],
    queryFn: dashboardApi.getManagerDashboard,
  });

  if (isLoading || !data) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Recruits" value={data.team_overview.total_recruits} />
        <StatCard label="Active Recruits" value={data.team_overview.active_recruits} />
        <StatCard
          label="Avg Completion Rate"
          value={`${data.team_overview.avg_task_completion_rate}%`}
        />
      </div>

      {data.open_blockers.total > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">
            {data.open_blockers.critical} critical, {data.open_blockers.high} high priority blockers
          </p>
        </div>
      )}

      <Card>
        <CardContent>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Team Members</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Completion</th>
                  <th className="pb-3 font-medium">Open Issues</th>
                  <th className="pb-3 font-medium">This Week</th>
                  <th className="pb-3 font-medium">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {data.recruits.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100">
                    <td className="py-3 font-medium text-gray-900">
                      {r.first_name} {r.last_name}
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 rounded-full bg-gray-200">
                          <div
                            className="h-2 rounded-full bg-blue-600"
                            style={{ width: `${r.task_completion_rate}%` }}
                          />
                        </div>
                        <span>{r.task_completion_rate}%</span>
                      </div>
                    </td>
                    <td className="py-3">{r.open_issues}</td>
                    <td className="py-3">{r.total_entries_this_week}</td>
                    <td className="py-3 text-gray-500">
                      {r.last_activity_at
                        ? new Date(r.last_activity_at).toLocaleDateString()
                        : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardAnalyticsSummary() {
  const to = new Date();
  const from = new Date(to.getTime() - 14 * 24 * 60 * 60 * 1000);
  const params = {
    from_date: from.toISOString().split('T')[0],
    to_date: to.toISOString().split('T')[0],
  };

  const { data } = useQuery({
    queryKey: ['analytics', 'dashboard-summary', params],
    queryFn: () => analyticsApi.getOverview(params),
  });

  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Trends (Last 14 Days)</h3>
        <Link to="/analytics" className="text-sm font-medium text-blue-600 hover:text-blue-800">
          View full analytics
        </Link>
      </div>
      <TaskCompletionChart data={data.task_trends} />
      <RecruitActivityChart data={data.recruit_activity} />
    </div>
  );
}

function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: dashboardApi.getAdminDashboard,
  });

  if (isLoading || !data) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={data.user_stats.total} />
        <StatCard label="New This Month" value={data.user_stats.new_this_month} />
        <StatCard label="Total Tasks" value={data.system_metrics.total_tasks} />
        <StatCard label="Open Issues" value={data.issue_overview.open} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardContent>
            <h3 className="mb-3 font-semibold text-gray-900">Users by Role</h3>
            {data.user_stats.by_role.map((r) => (
              <div key={r.role} className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-600">{r.role}</span>
                <span className="text-sm font-medium text-gray-900">{r.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="mb-3 font-semibold text-gray-900">System Metrics</h3>
            <div className="space-y-1.5 text-sm">
              <MetricRow label="Tasks" value={data.system_metrics.total_tasks} />
              <MetricRow label="Issues" value={data.system_metrics.total_issues} />
              <MetricRow label="Notes" value={data.system_metrics.total_notes} />
              <MetricRow label="Feedback" value={data.system_metrics.total_feedback} />
              <MetricRow label="Assignments" value={data.system_metrics.total_assignments} />
            </div>
          </CardContent>
        </Card>
      </div>

      {data.issue_overview.critical_open > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">
            {data.issue_overview.critical_open} critical open issue{data.issue_overview.critical_open > 1 ? 's' : ''} require attention
          </p>
        </div>
      )}

      <Card>
        <CardContent>
          <h3 className="mb-4 font-semibold text-gray-900">Recent Signups</h3>
          <div className="space-y-2">
            {data.recent_signups.map((u) => (
              <div key={u.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {u.first_name} {u.last_name}
                  </p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={u.role} />
                  <span className="text-xs text-gray-400">
                    {new Date(u.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function RecentList({
  title,
  entries,
}: {
  title: string;
  entries: { id: string; title: string; type: string; status?: string; created_at: string }[];
}) {
  return (
    <Card>
      <CardContent>
        <h3 className="mb-3 font-semibold text-gray-900">{title}</h3>
        {entries.length === 0 ? (
          <p className="text-sm text-gray-500">No recent entries</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-2.5">
                <span className="text-sm text-gray-700 truncate">{e.title}</span>
                {e.status && <StatusBadge status={e.status} />}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function MetricRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <PageLayout>
      <ErrorBoundary>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.first_name}!</h1>
            <p className="mt-1 text-gray-600">Here&apos;s your onboarding overview.</p>
          </div>

          {user?.role === Role.RECRUIT && <RecruitDashboard />}
          {user?.role === Role.MANAGER && <ManagerDashboard />}
          {user?.role === Role.ADMIN && <AdminDashboard />}
        </div>
      </ErrorBoundary>
    </PageLayout>
  );
}
