import type { Metadata } from 'next';

import { OpenIssuesPanel, RecentEntriesPanel } from '@/components/dashboard/panels';
import { PeriodTabs } from '@/components/dashboard/period-tabs';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { dashboardQuerySchema } from '@/src/modules/dashboard/schemas';
import { getUserDashboard } from '@/src/modules/dashboard/service';
import { parseSearchParams } from '@/src/modules/entries/schemas';

export const metadata: Metadata = { title: 'Dashboard | Onboarding Diary' };
export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * Everyone's landing page is their own diary, whatever their role: a manager
 * sees their own entries here and their reports under Team. Keeping the two
 * apart means the actor of a page is never ambiguous.
 */
export default async function DashboardPage({ searchParams }: PageProps) {
  const actor = await requireCurrentUser();
  const query = parseSearchParams(dashboardQuerySchema, await searchParams);
  const dashboard = await getUserDashboard(actor, actor.id, query);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome, {actor.full_name}</h1>
          <p className="text-muted-foreground text-sm">
            {dashboard.user.role === 'RECRUIT'
              ? `Day ${dashboard.user.days_since_start} of onboarding · `
              : ''}
            last {dashboard.period.days} days
          </p>
        </div>
        <PeriodTabs basePath="/dashboard" days={dashboard.period.days} />
      </div>

      <SummaryCards summary={dashboard.summary} showNotes />

      <div className="grid gap-4 lg:grid-cols-2">
        <OpenIssuesPanel issues={dashboard.open_issues} ownerNames={false} />
        <RecentEntriesPanel entries={dashboard.recent_entries} ownerNames={false} />
      </div>
    </div>
  );
}
