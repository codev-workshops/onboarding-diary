import Link from 'next/link';

import { CompletionBar } from '@/components/dashboard/summary-cards';
import { formatDate } from '@/components/entries/labels';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { TeamMemberRollup } from '@/src/modules/dashboard/dto';

/**
 * A recruit with no activity for a week, a critical blocker, or a stalled
 * completion rate past their second week is worth a manager's attention. The
 * flag is advisory: it steers the eye, it does not gate anything.
 */
export function needsAttention(member: TeamMemberRollup, now = new Date()): boolean {
  if (member.summary.issues_critical_open > 0) return true;

  if (member.user.days_since_start > 14 && member.summary.task_completion_pct < 40) return true;

  if (!member.last_activity_at) return member.user.days_since_start >= 7;

  const idleDays = (now.getTime() - new Date(member.last_activity_at).getTime()) / 86_400_000;
  return idleDays >= 7;
}

export function TeamRoster({ members }: { members: TeamMemberRollup[] }) {
  if (members.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="font-medium">No recruits assigned</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Recruits appear here as soon as an admin assigns them to you.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Recruit</TableHead>
          <TableHead>Started</TableHead>
          <TableHead className="text-right">Tasks</TableHead>
          <TableHead>Completion</TableHead>
          <TableHead className="text-right">Open issues</TableHead>
          <TableHead>Last activity</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.user.id}>
            <TableCell>
              <Link href={`/team/${member.user.id}`} prefetch={false} className="font-medium hover:underline">
                {member.user.full_name}
              </Link>
              <p className="text-muted-foreground text-xs">{member.user.department ?? 'No department'}</p>
              {member.user.is_active ? null : (
                <Badge variant="ghost" className="mt-1">
                  Deactivated
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-sm">
              {formatDate(member.user.start_date)}
              <p className="text-muted-foreground text-xs">Day {member.user.days_since_start}</p>
            </TableCell>
            <TableCell className="text-right text-sm">{member.summary.tasks_total}</TableCell>
            <TableCell className="w-40">
              <CompletionBar pct={member.summary.task_completion_pct} />
              <p className="text-muted-foreground mt-1 text-xs">{member.summary.task_completion_pct}%</p>
            </TableCell>
            <TableCell className="text-right text-sm">
              {member.summary.issues_open}
              {member.summary.issues_critical_open > 0 ? (
                <Badge variant="destructive" className="ml-2">
                  {member.summary.issues_critical_open} critical
                </Badge>
              ) : null}
            </TableCell>
            <TableCell className="text-sm">
              {member.last_activity_at ? formatDate(member.last_activity_at.slice(0, 10)) : '—'}
              {needsAttention(member) ? (
                <Badge variant="secondary" className="ml-2">
                  Needs attention
                </Badge>
              ) : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
