import type { Metadata } from 'next';
import Link from 'next/link';

import { CompletionBar, SummaryCards } from '@/components/dashboard/summary-cards';
import { PeriodTabs } from '@/components/dashboard/period-tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { dashboardQuerySchema } from '@/src/modules/dashboard/schemas';
import { getOrgDashboard } from '@/src/modules/dashboard/service';
import { parseSearchParams } from '@/src/modules/entries/schemas';
import { pageOr404 } from '@/src/shared/http/page-guard';

export const metadata: Metadata = { title: 'Organisation | Onboarding Diary' };
export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * Admin-wide view. The unassigned-recruit list is the point of the page as much
 * as the totals: those recruits sit outside every manager's scope, so nobody
 * else in the product can see that they are drifting.
 */
export default async function OrgOverviewPage({ searchParams }: PageProps) {
  const actor = await requireCurrentUser();
  const query = parseSearchParams(dashboardQuerySchema, await searchParams);
  const org = await pageOr404(getOrgDashboard(actor, query));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Organisation</h1>
          <p className="text-muted-foreground text-sm">
            {org.totals.recruits} recruits · {org.totals.managers} managers · {org.totals.admins} admins ·
            last {org.period.days} days
          </p>
        </div>
        <PeriodTabs basePath="/admin/overview" days={org.period.days} />
      </div>

      <SummaryCards summary={org.totals} showNotes />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Departments</CardTitle>
          <CardDescription>Recruit activity grouped by department.</CardDescription>
        </CardHeader>
        <CardContent>
          {org.departments.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">No recruits yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-right">Recruits</TableHead>
                  <TableHead className="text-right">Tasks</TableHead>
                  <TableHead>Completion</TableHead>
                  <TableHead className="text-right">Open issues</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {org.departments.map((row) => (
                  <TableRow key={row.department}>
                    <TableCell className="font-medium">{row.department}</TableCell>
                    <TableCell className="text-right text-sm">{row.recruits}</TableCell>
                    <TableCell className="text-right text-sm">{row.summary.tasks_total}</TableCell>
                    <TableCell className="w-40">
                      <CompletionBar pct={row.summary.task_completion_pct} />
                      <p className="text-muted-foreground mt-1 text-xs">{row.summary.task_completion_pct}%</p>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {row.summary.issues_open}
                      {row.summary.issues_critical_open > 0 ? (
                        <Badge variant="destructive" className="ml-2">
                          {row.summary.issues_critical_open} critical
                        </Badge>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recruits without a manager</CardTitle>
          <CardDescription>Nobody but an admin can see these diaries.</CardDescription>
        </CardHeader>
        <CardContent>
          {org.unassigned_recruits.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">Every recruit has a manager.</p>
          ) : (
            <ul className="divide-y">
              {org.unassigned_recruits.map((recruit) => (
                <li key={recruit.id} className="py-2.5">
                  <Link href={`/team/${recruit.id}`} prefetch={false} className="text-sm hover:underline">
                    {recruit.full_name}
                  </Link>
                  <p className="text-muted-foreground text-xs">Started {recruit.start_date}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
