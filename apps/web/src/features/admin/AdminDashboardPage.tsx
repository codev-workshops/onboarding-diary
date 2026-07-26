/**
 * Admin dashboard (T-163): organisation-wide totals plus the way into user management
 * (FR-D7).
 */

import { ROLES, ROLE_LABELS } from '@onboarding-diary/shared';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { ErrorState, Skeleton } from '../../components/ui/states.js';
import { ProgressBar, StatTile } from '../dashboard/tiles.js';
import { useAdminDashboard } from '../dashboard/useDashboard.js';

export function AdminDashboardPage(): ReactNode {
  const query = useAdminDashboard();

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Administration</h1>
        <Link className="text-sm font-medium text-sky-800 underline" to="/admin/users">
          Manage users
        </Link>
      </div>

      {query.isPending ? (
        <div role="status" aria-label="Loading organisation totals" className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StatTile
              label="Users"
              value={query.data.users.total}
              hint={`${query.data.users.active} active, ${query.data.users.inactive} deactivated`}
            />
            {ROLES.map((role) => (
              <StatTile
                key={role}
                label={ROLE_LABELS[role]}
                value={query.data.users.byRole[role]}
              />
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Tasks" value={query.data.counts.tasks} />
            <StatTile label="Issues" value={query.data.counts.issues} />
            <StatTile label="Feedback" value={query.data.counts.feedback} />
            <StatTile label="Notes" value={query.data.counts.notes} />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <ProgressBar
              label="Organisation task completion"
              completed={query.data.taskProgress.completed}
              total={query.data.taskProgress.total}
              percent={query.data.taskProgress.completionPercent}
            />
            <p className="mt-3 text-sm text-slate-700">
              {query.data.openIssues.total} open issues across all recruits.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
