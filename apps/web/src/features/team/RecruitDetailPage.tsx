/**
 * Read-only recruit diary for managers and admins (T-162). Every tab reuses the recruit's own
 * page in `readOnly` mode, so there is exactly one implementation of each list and no way for
 * a write control to leak into this view (FR-X2, AC-8).
 */

import type { UserDto } from '@onboarding-diary/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';

import { queryKeys } from '../../app/queryKeys.js';
import { ErrorState, Skeleton } from '../../components/ui/states.js';
import { useApiClient } from '../../lib/ApiClientContext.js';
import { DashboardView } from '../dashboard/DashboardView.js';
import { useDashboard } from '../dashboard/useDashboard.js';
import { FeedbackPage } from '../feedback/FeedbackPage.js';
import { IssuesPage } from '../issues/IssuesPage.js';
import { NotesPage } from '../notes/NotesPage.js';
import { ReportBuilder } from '../reports/ReportBuilder.js';
import { TasksPage } from '../tasks/TasksPage.js';

const TABS = ['Overview', 'Tasks', 'Issues', 'Feedback', 'Notes', 'Report'] as const;
type Tab = (typeof TABS)[number];

function useUser(id: string) {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: async () => {
      const response = await client.get<{ data: UserDto }>(`/users/${id}`);
      return response.data;
    },
  });
}

export function RecruitDetailPage(): ReactNode {
  const { userId = '' } = useParams<{ userId: string }>();
  const user = useUser(userId);
  const dashboard = useDashboard(userId);
  const [tab, setTab] = useState<Tab>('Overview');

  if (user.isError) return <ErrorState error={user.error} onRetry={() => void user.refetch()} />;

  return (
    <section className="flex flex-col gap-4">
      <div>
        <Link className="text-sm text-sky-800 underline" to="/team">
          Back to your team
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">
          {user.isPending ? 'Loading recruit' : user.data.fullName}
        </h1>
        <p className="text-sm text-slate-600">
          Read-only view of this recruit&apos;s onboarding diary.
        </p>
      </div>

      <div role="tablist" aria-label="Diary sections" className="flex gap-1 overflow-x-auto">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={tab === name}
            className={[
              'rounded-md px-3 py-2 text-sm whitespace-nowrap',
              tab === name
                ? 'bg-sky-100 font-medium text-sky-900'
                : 'text-slate-600 hover:bg-slate-100',
            ].join(' ')}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-label={tab}>
        {tab === 'Overview' ? (
          dashboard.isPending ? (
            <Skeleton className="h-24 w-full" />
          ) : dashboard.isError ? (
            <ErrorState error={dashboard.error} onRetry={() => void dashboard.refetch()} />
          ) : (
            <DashboardView dashboard={dashboard.data} />
          )
        ) : null}
        {tab === 'Tasks' ? <TasksPage ownerId={userId} readOnly /> : null}
        {tab === 'Issues' ? <IssuesPage ownerId={userId} readOnly /> : null}
        {tab === 'Feedback' ? <FeedbackPage ownerId={userId} readOnly /> : null}
        {tab === 'Notes' ? <NotesPage ownerId={userId} readOnly /> : null}
        {tab === 'Report' ? (
          <ReportBuilder
            ownerId={userId}
            {...(user.data === undefined ? {} : { ownerName: user.data.fullName })}
          />
        ) : null}
      </div>
    </section>
  );
}
