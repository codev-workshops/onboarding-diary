/**
 * Manager dashboard (T-161): one tile per direct report with task progress, open issues, and
 * the date they last logged anything (FR-D5).
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { EmptyState, ErrorState, Skeleton } from '../../components/ui/states.js';
import { useDirectReports } from '../dashboard/useDashboard.js';
import { ProgressBar } from '../dashboard/tiles.js';

export function TeamPage(): ReactNode {
  const query = useDirectReports();

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-slate-900">Your team</h1>

      {query.isPending ? (
        <div role="status" aria-label="Loading team" className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : query.data.length === 0 ? (
        <EmptyState
          title="No direct reports yet"
          description="An administrator assigns recruits to you; they will appear here."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {query.data.map((report) => (
            <li
              key={report.user.id}
              className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4"
            >
              <div>
                <Link
                  className="text-base font-semibold text-sky-800 underline"
                  to={`/team/${report.user.id}`}
                >
                  {report.user.fullName}
                </Link>
                <p className="text-xs text-slate-600">
                  {report.user.department ?? 'No department'}
                </p>
              </div>
              <ProgressBar
                label={`Task completion for ${report.user.fullName}`}
                completed={report.taskProgress.completed}
                total={report.taskProgress.total}
                percent={report.taskProgress.completionPercent}
              />
              <dl className="flex gap-6 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Open issues</dt>
                  <dd className="font-semibold text-slate-900">{report.openIssueCount}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Last activity</dt>
                  <dd className="font-semibold text-slate-900">
                    {report.lastActivityDate ?? 'None yet'}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
