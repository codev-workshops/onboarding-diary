import type { Metadata } from 'next';

import { PeriodTabs } from '@/components/dashboard/period-tabs';
import { SummaryCards } from '@/components/dashboard/summary-cards';
import { TeamRoster } from '@/components/dashboard/team-roster';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { dashboardQuerySchema } from '@/src/modules/dashboard/schemas';
import { getTeamDashboard } from '@/src/modules/dashboard/service';
import { parseSearchParams } from '@/src/modules/entries/schemas';
import { pageOr404 } from '@/src/shared/http/page-guard';

export const metadata: Metadata = { title: 'Team | Onboarding Diary' };
export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * The roster is whatever `readable_user_ids` returns — no role branch here. A
 * recruit reaching this URL is refused by the service, not by a check in the
 * page, so the navigation link being hidden is decoration.
 */
export default async function TeamPage({ searchParams }: PageProps) {
  const actor = await requireCurrentUser();
  const query = parseSearchParams(dashboardQuerySchema, await searchParams);
  const team = await pageOr404(getTeamDashboard(actor, query));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-muted-foreground text-sm">
            {team.totals.recruits} recruit{team.totals.recruits === 1 ? '' : 's'} in your scope · last{' '}
            {team.period.days} days
          </p>
        </div>
        <PeriodTabs basePath="/team" days={team.period.days} />
      </div>

      <SummaryCards summary={team.totals} showNotes={false} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recruits</CardTitle>
          <CardDescription>
            Private notes are never counted here, and feedback marked admin-only is excluded.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamRoster members={team.members} />
        </CardContent>
      </Card>
    </div>
  );
}
