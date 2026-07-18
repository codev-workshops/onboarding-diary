import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorState, LoadingState } from '@/components/states';
import { useCategories, useDepartments, useUsers } from '@/hooks/data';
import { useAppConfig } from '@/hooks/useAppConfig';
import { api } from '@/lib/api';
import type { DashboardSummary } from '@/lib/types';

/** URL of the one-off setup tool (run separately in demo mode only). */
const SETUP_URL = import.meta.env.VITE_SETUP_URL ?? 'http://localhost:4100';

/** Admin landing page: organization overview (docs/ASSUMPTIONS.md §15). */
export function OverviewPage() {
  const users = useUsers();
  const departments = useDepartments();
  const categories = useCategories();
  const config = useAppConfig();
  const summary = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<DashboardSummary>('/dashboard'),
  });

  if (users.isLoading || departments.isLoading || categories.isLoading || summary.isLoading) {
    return <LoadingState />;
  }
  const error = users.error ?? departments.error ?? categories.error ?? summary.error;
  if (error) return <ErrorState message={(error as Error).message} />;

  const userList = users.data ?? [];
  const managers = userList.filter((u) => u.role === 'Manager').length;
  const recruits = userList.filter((u) => u.role === 'Recruit').length;
  const activeCategories = (categories.data ?? []).filter((c) => c.isActive).length;

  return (
    <div>
      <PageHeader
        title="Organization overview"
        description="Totals across the workspace and quick links to management."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Users"
          value={userList.length}
          sub={`${managers} managers · ${recruits} recruits`}
        />
        <Stat label="Departments" value={(departments.data ?? []).length} sub="across the org" />
        <Stat label="Categories" value={activeCategories} sub="active task categories" />
        <Stat
          label="Open issues"
          value={summary.data?.issues.open ?? 0}
          sub={`${summary.data?.issues.total ?? 0} total`}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <QuickLink
          to="/admin"
          title="Manage users, departments & categories"
          description="Provision users, assign recruits to managers, and curate task categories."
        />
        <QuickLink
          to="/reports"
          title="Generate reports"
          description="Preview org-wide activity on screen, then export to PDF or CSV."
        />
      </div>

      {config.data?.demoMode ? (
        <Card className="mt-6 border-primary/40">
          <CardHeader>
            <CardTitle>Move to production</CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <p className="text-sm text-muted-foreground">
              You are in demo mode (SQLite, sample data). When you are ready, use the one-off setup
              tool to provision a PostgreSQL database and your real administrator, then restart the
              server. Demo accounts and the shared demo password are never copied to production.
            </p>
            <a
              href={SETUP_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Open the setup tool
            </a>
          </CardContent>
        </Card>
      ) : null}

      {summary.data ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Aggregate activity</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Tasks" value={summary.data.tasks.total} />
            <Metric label="Completion" value={`${summary.data.tasks.completionRate}%`} />
            <Metric label="Feedback" value={summary.data.feedback.total} />
            <Metric label="Notes" value={summary.data.notes.total} />
          </CardContent>
        </Card>
      ) : null}
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

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

function QuickLink({ to, title, description }: { to: string; title: string; description: string }) {
  return (
    <Link to={to} className="block">
      <Card className="transition-colors hover:border-primary">
        <CardContent className="p-5">
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
