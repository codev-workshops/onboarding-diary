import type { Metadata } from 'next';
import Link from 'next/link';

import { OpenIssuesPanel, RecentEntriesPanel } from '@/components/dashboard/panels';
import { PeriodTabs } from '@/components/dashboard/period-tabs';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { dashboardQuerySchema } from '@/src/modules/dashboard/schemas';
import { getUserDashboard } from '@/src/modules/dashboard/service';
import { parseSearchParams } from '@/src/modules/entries/schemas';
import { pageOr404 } from '@/src/shared/http/page-guard';

export const metadata: Metadata = { title: 'Recruit | Onboarding Diary' };
export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** One recruit's diary, seen through the viewer's own scope. */
export default async function RecruitPage({ params, searchParams }: PageProps) {
  const actor = await requireCurrentUser();
  const { id } = await params;
  const query = parseSearchParams(dashboardQuerySchema, await searchParams);

  const dashboard = await pageOr404(getUserDashboard(actor, id, query));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/team" prefetch={false} className="text-muted-foreground text-sm hover:underline">
            ← Team
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{dashboard.user.full_name}</h1>
          <p className="text-muted-foreground text-sm">
            {dashboard.user.role === 'RECRUIT'
              ? `Day ${dashboard.user.days_since_start} of onboarding · `
              : ''}
            last {dashboard.period.days} days
          </p>
        </div>
        <PeriodTabs basePath={`/team/${dashboard.user.id}`} days={dashboard.period.days} />
      </div>

      <SummaryCards summary={dashboard.summary} showNotes={actor.role === 'ADMIN'} />

      <div className="grid gap-4 lg:grid-cols-2">
        <OpenIssuesPanel issues={dashboard.open_issues} ownerNames={false} />
        <RecentEntriesPanel entries={dashboard.recent_entries} ownerNames={false} />
      </div>
    </div>
  );
}
