import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { notFound } from '@/src/modules/authz/errors';
import { assertRole } from '@/src/modules/authz/policy';
import { assertOwnerInScope, type Actor } from '@/src/modules/authz/scope';
import type {
  DashboardPeriod,
  DashboardSummary,
  DepartmentRollup,
  OrgDashboard,
  RecentEntry,
  TeamDashboard,
  TeamMemberRollup,
  UserDashboard,
} from '@/src/modules/dashboard/dto';
import type { DashboardQuery } from '@/src/modules/dashboard/schemas';
import { canReadNotesOf } from '@/src/modules/entries/base-repository';
import { orderByWithTiebreak } from '@/src/modules/entries/paging';
import {
  feedbackCounts,
  feedbackRepository,
  issueRepository,
  issueStatusCounts,
  lastActivityByOwner,
  noteCounts,
  noteRepository,
  taskRepository,
  taskStatusCounts,
  type IssueStatusCount,
  type OwnerCount,
  type Period,
  type TaskStatusCount,
} from '@/src/modules/entries/repositories';
import { toIssueDto, type IssueDto } from '@/src/modules/issues/dto';
import { getScopedUser, listVisibleUsers } from '@/src/modules/users/service';

const RECENT_ENTRY_LIMIT = 10;
const OPEN_ISSUE_LIMIT = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

const asDate = (value: Date): string => value.toISOString().slice(0, 10);

const newestFirst = orderByWithTiebreak('entryDate', 'desc');

function periodFor(query: DashboardQuery, now = new Date()): Period & { dto: DashboardPeriod } {
  const to = new Date(`${asDate(now)}T00:00:00.000Z`);
  const from = new Date(to.getTime() - (query.days - 1) * DAY_MS);

  return { from, to, dto: { date_from: asDate(from), date_to: asDate(to), days: query.days } };
}

function daysSinceStart(startDate: string, now = new Date()): number {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const today = new Date(`${asDate(now)}T00:00:00.000Z`).getTime();
  return Math.max(0, Math.round((today - start) / DAY_MS));
}

/**
 * C3: the completion percentage is defined once, here, and cancelled tasks
 * leave the denominator rather than counting as failures. A recruit who
 * cancels everything scores 0, not 100 — hence the guard on an empty
 * denominator rather than a bare division.
 */
export function completionPct(done: number, total: number, cancelled: number): number {
  const eligible = total - cancelled;
  if (eligible <= 0) return 0;
  return Math.round((1000 * done) / eligible) / 10;
}

const EMPTY_SUMMARY: DashboardSummary = {
  tasks_total: 0,
  tasks_done: 0,
  tasks_cancelled: 0,
  task_completion_pct: 0,
  issues_total: 0,
  issues_open: 0,
  issues_critical_open: 0,
  feedback_total: 0,
  notes_total: 0,
};

type Grouped = {
  tasks: TaskStatusCount[];
  issues: IssueStatusCount[];
  feedback: OwnerCount[];
  notes: OwnerCount[];
};

/**
 * Folds the grouped rows for one owner (or, with `ownerIds`, for a whole team)
 * into the summary shape. Everything is assembled in memory from four queries,
 * so adding a recruit to a manager's team does not add a query (§16.4).
 */
function summarize(grouped: Grouped, keep: (ownerId: string) => boolean): DashboardSummary {
  const summary = { ...EMPTY_SUMMARY };

  for (const row of grouped.tasks) {
    if (!keep(row.ownerId)) continue;
    summary.tasks_total += row.count;
    if (row.status === 'DONE') summary.tasks_done += row.count;
    if (row.status === 'CANCELLED') summary.tasks_cancelled += row.count;
  }

  for (const row of grouped.issues) {
    if (!keep(row.ownerId)) continue;
    summary.issues_total += row.count;
    if (row.status === 'OPEN' || row.status === 'IN_PROGRESS') {
      summary.issues_open += row.count;
      if (row.severity === 'CRITICAL') summary.issues_critical_open += row.count;
    }
  }

  for (const row of grouped.feedback) if (keep(row.ownerId)) summary.feedback_total += row.count;
  for (const row of grouped.notes) if (keep(row.ownerId)) summary.notes_total += row.count;

  summary.task_completion_pct = completionPct(
    summary.tasks_done,
    summary.tasks_total,
    summary.tasks_cancelled
  );

  return summary;
}

async function groupedCounts(actor: Actor, period: Period, options: { ownerId?: string }): Promise<Grouped> {
  const [tasks, issues, feedback, notes] = await Promise.all([
    taskStatusCounts(actor, period, options),
    issueStatusCounts(actor, period, options),
    feedbackCounts(actor, period, options),
    noteCounts(actor, period, options),
  ]);

  return { tasks, issues, feedback, notes };
}

/**
 * The open-issue widget deliberately ignores the period: an issue raised 40
 * days ago and still blocking someone is the single most important row on the
 * page, and a 30-day window would hide exactly that. The `issues_open` counter
 * beside it is period-scoped as §16.2 defines it, so the two can legitimately
 * disagree; the UI labels the list "all time" for that reason.
 */
async function openIssuesFor(actor: Actor, ownerId?: string): Promise<IssueDto[]> {
  const filters: Prisma.IssueEntryWhereInput[] = [{ status: { in: ['OPEN', 'IN_PROGRESS'] } }];

  const rows = await issueRepository.list(actor, {
    ownerId,
    filters,
    orderBy: newestFirst,
    take: OPEN_ISSUE_LIMIT,
  });

  return rows.map(toIssueDto);
}

/**
 * Recent activity across the four kinds. Each repository contributes at most
 * `RECENT_ENTRY_LIMIT` rows under its own scope predicate, and the merge is a
 * sort — a kind the caller may not read simply contributes nothing, which is
 * why a manager's view of a report never shows a note.
 */
async function recentEntriesFor(actor: Actor, ownerId?: string): Promise<RecentEntry[]> {
  const page = { ownerId, orderBy: newestFirst, take: RECENT_ENTRY_LIMIT };

  const [tasks, issues, feedback, notes] = await Promise.all([
    taskRepository.list(actor, page),
    issueRepository.list(actor, page),
    feedbackRepository.list(actor, page),
    canReadNotesOf(actor, ownerId) ? noteRepository.list(actor, page) : [],
  ]);

  const entries: RecentEntry[] = [
    ...tasks.map((row) => toRecentEntry('TASK', row, row.title)),
    ...issues.map((row) => toRecentEntry('ISSUE', row, row.title)),
    ...feedback.map((row) => toRecentEntry('FEEDBACK', row, row.subject)),
    ...notes.map((row) => toRecentEntry('NOTE', row, row.title)),
  ];

  return entries
    .sort((a, b) => b.entry_date.localeCompare(a.entry_date) || b.created_at.localeCompare(a.created_at))
    .slice(0, RECENT_ENTRY_LIMIT);
}

type RecentRow = {
  id: string;
  entryDate: Date;
  createdAt: Date;
  owner: { id: string; fullName: string };
};

function toRecentEntry(kind: RecentEntry['kind'], row: RecentRow, title: string): RecentEntry {
  return {
    id: row.id,
    kind,
    title,
    entry_date: asDate(row.entryDate),
    created_at: row.createdAt.toISOString(),
    owner: { id: row.owner.id, full_name: row.owner.fullName },
  };
}

/**
 * One person's dashboard. `userId` goes through `assertOwnerInScope` before any
 * query runs, so an out-of-scope recruit is refused with the same 403 the entry
 * lists give rather than an empty-but-successful dashboard — a zeroed dashboard
 * would itself be an answer about somebody else's diary.
 */
export async function getUserDashboard(
  actor: Actor,
  userId: string,
  query: DashboardQuery
): Promise<UserDashboard> {
  // A malformed id is indistinguishable from an unknown one, as everywhere else.
  if (!z.string().uuid().safeParse(userId).success) throw notFound();

  await assertOwnerInScope(actor, userId);

  const period = periodFor(query);
  const [subject, grouped, openIssues, recent, activity] = await Promise.all([
    getScopedUser(actor, userId),
    groupedCounts(actor, period, { ownerId: userId }),
    openIssuesFor(actor, userId),
    recentEntriesFor(actor, userId),
    lastActivityByOwner(actor, { ownerId: userId }),
  ]);

  return {
    user: {
      id: subject.id,
      full_name: subject.full_name,
      start_date: subject.start_date,
      days_since_start: daysSinceStart(subject.start_date),
    },
    period: period.dto,
    summary: summarize(grouped, () => true),
    open_issues: openIssues,
    recent_entries: recent,
    last_activity_at: activity[0]?.lastActivityAt?.toISOString() ?? null,
  };
}

/**
 * The roster. Recruits in scope come from the directory (which applies
 * `readable_user_ids` itself), and their metrics come from the four grouped
 * queries — never one query per recruit.
 */
export async function getTeamDashboard(actor: Actor, query: DashboardQuery): Promise<TeamDashboard> {
  assertRole(actor, ['MANAGER', 'ADMIN']);

  const period = periodFor(query);
  const [users, grouped, activity] = await Promise.all([
    listVisibleUsers(actor),
    groupedCounts(actor, period, {}),
    lastActivityByOwner(actor, {}),
  ]);

  const recruits = users.filter((user) => user.role === 'RECRUIT');
  const lastActivity = new Map(activity.map((row) => [row.ownerId, row.lastActivityAt]));

  const members: TeamMemberRollup[] = recruits.map((user) => ({
    user: {
      id: user.id,
      full_name: user.full_name,
      department: user.department?.name ?? null,
      start_date: user.start_date,
      days_since_start: daysSinceStart(user.start_date),
      is_active: user.is_active,
    },
    summary: summarize(grouped, (ownerId) => ownerId === user.id),
    last_activity_at: lastActivity.get(user.id)?.toISOString() ?? null,
  }));

  const ids = new Set(recruits.map((user) => user.id));

  return {
    period: period.dto,
    totals: { ...summarize(grouped, (ownerId) => ids.has(ownerId)), recruits: recruits.length },
    members,
  };
}

export async function getOrgDashboard(actor: Actor, query: DashboardQuery): Promise<OrgDashboard> {
  assertRole(actor, ['ADMIN']);

  const period = periodFor(query);
  const [users, grouped] = await Promise.all([listVisibleUsers(actor), groupedCounts(actor, period, {})]);

  const recruits = users.filter((user) => user.role === 'RECRUIT');
  const byDepartment = new Map<string, Set<string>>();

  for (const recruit of recruits) {
    const name = recruit.department?.name ?? 'Unassigned';
    const members = byDepartment.get(name) ?? new Set<string>();
    members.add(recruit.id);
    byDepartment.set(name, members);
  }

  const departments: DepartmentRollup[] = [...byDepartment]
    .map(([department, ids]) => ({
      department,
      recruits: ids.size,
      summary: summarize(grouped, (ownerId) => ids.has(ownerId)),
    }))
    .sort((a, b) => a.department.localeCompare(b.department));

  return {
    period: period.dto,
    totals: {
      ...summarize(grouped, () => true),
      recruits: recruits.length,
      managers: users.filter((user) => user.role === 'MANAGER').length,
      admins: users.filter((user) => user.role === 'ADMIN').length,
    },
    departments,
    unassigned_recruits: recruits
      .filter((user) => user.manager_id === null)
      .map((user) => ({ id: user.id, full_name: user.full_name, start_date: user.start_date })),
  };
}
