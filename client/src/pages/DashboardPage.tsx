import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, toneFor } from '@/components/ui/badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { api } from '@/lib/api';
import type { DashboardSummary } from '@/lib/types';
import { toDateInput } from '@/lib/utils';

const STATUS_COLORS = ['#94a3b8', '#0ea5e9', '#22c55e'];

export function DashboardPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<DashboardSummary>('/dashboard'),
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={(error as Error).message} />;
  if (!data) return null;

  const statusData = Object.entries(data.tasks.byStatus).map(([name, value]) => ({ name, value }));
  const severityData = Object.entries(data.issues.bySeverity).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div>
      <PageHeader title="Dashboard" description="Your onboarding progress at a glance." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Tasks" value={data.tasks.total} sub={`${data.tasks.completed} completed`} />
        <Stat
          label="Completion"
          value={`${data.tasks.completionRate}%`}
          sub="of tasks done"
        />
        <Stat label="Open issues" value={data.issues.open} sub={`${data.issues.total} total`} />
        <Stat label="Notes" value={data.notes.total} sub={`${data.feedback.total} feedback`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Task completion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-success transition-all"
                style={{ width: `${data.tasks.completionRate}%` }}
                role="progressbar"
                aria-valuenow={data.tasks.completionRate}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
            {statusData.length === 0 ? (
              <EmptyState title="No tasks yet" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" outerRadius={80} label>
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Issues by severity</CardTitle>
          </CardHeader>
          <CardContent>
            {severityData.length === 0 ? (
              <EmptyState title="No issues logged" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={severityData}>
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent entries</CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentEntries.length === 0 ? (
            <EmptyState title="No recent activity" />
          ) : (
            <ul className="divide-y divide-border">
              {data.recentEntries.map((e) => (
                <li key={`${e.kind}-${e.id}`} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Badge tone={toneFor(e.kind)}>{e.kind}</Badge>
                    <span className="font-medium">{e.title}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{toDateInput(e.date)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-bold">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}
