import type { Db } from '../../db/prisma.js';
import type { JwtPayload } from '../../auth/jwt.js';
import { accessibleOwnerIds, ownerFilter } from '../../access/scope.js';
import { DONE_TASK_STATUS, OPEN_ISSUE_STATUSES } from '../../domain/enums.js';

export interface RecentEntry {
  id: string;
  kind: 'task' | 'issue' | 'feedback' | 'note';
  title: string;
  date: string;
  createdAt: string;
}

export interface DashboardSummary {
  tasks: {
    total: number;
    completed: number;
    completionRate: number;
    byStatus: Record<string, number>;
  };
  issues: {
    total: number;
    open: number;
    bySeverity: Record<string, number>;
  };
  feedback: { total: number };
  notes: { total: number };
  recentEntries: RecentEntry[];
}

function tally(rows: { key: string }[]): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, { key }) => {
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

/**
 * Builds the dashboard summary for a user, scoped by role (docs/ASSUMPTIONS.md
 * §7). Completion progress and open-issue counts key off the semantic Tier-2
 * values (docs/ASSUMPTIONS.md §4).
 */
export async function getDashboardSummary(
  db: Db,
  actor: JwtPayload,
  recentLimit = 8,
): Promise<DashboardSummary> {
  const ids = await accessibleOwnerIds(db, actor);
  const where = ownerFilter(ids);

  const [tasks, issues, feedbackCount, notesCount] = await Promise.all([
    db.task.findMany({ where, select: { status: true } }),
    db.issue.findMany({ where, select: { status: true, severity: true } }),
    db.feedback.count({ where }),
    db.note.count({ where }),
  ]);

  const completed = tasks.filter((t) => t.status === DONE_TASK_STATUS).length;
  const open = issues.filter((i) => OPEN_ISSUE_STATUSES.includes(i.status as never)).length;

  const [recentTasks, recentIssues, recentFeedback, recentNotes] = await Promise.all([
    db.task.findMany({ where, orderBy: { createdAt: 'desc' }, take: recentLimit }),
    db.issue.findMany({ where, orderBy: { createdAt: 'desc' }, take: recentLimit }),
    db.feedback.findMany({ where, orderBy: { createdAt: 'desc' }, take: recentLimit }),
    db.note.findMany({ where, orderBy: { createdAt: 'desc' }, take: recentLimit }),
  ]);

  const recentEntries: RecentEntry[] = [
    ...recentTasks.map((t) => toRecent(t.id, 'task', t.title, t.date, t.createdAt)),
    ...recentIssues.map((i) => toRecent(i.id, 'issue', i.title, i.date, i.createdAt)),
    ...recentFeedback.map((f) => toRecent(f.id, 'feedback', f.subject, f.date, f.createdAt)),
    ...recentNotes.map((n) => toRecent(n.id, 'note', n.title, n.date, n.createdAt)),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, recentLimit);

  return {
    tasks: {
      total: tasks.length,
      completed,
      completionRate: tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100),
      byStatus: tally(tasks.map((t) => ({ key: t.status }))),
    },
    issues: {
      total: issues.length,
      open,
      bySeverity: tally(issues.map((i) => ({ key: i.severity }))),
    },
    feedback: { total: feedbackCount },
    notes: { total: notesCount },
    recentEntries,
  };
}

function toRecent(
  id: string,
  kind: RecentEntry['kind'],
  title: string,
  date: Date,
  createdAt: Date,
): RecentEntry {
  return { id, kind, title, date: date.toISOString(), createdAt: createdAt.toISOString() };
}

export interface TeamRecruitSummary {
  id: string;
  name: string;
  email: string;
  department: string | null;
  taskTotal: number;
  taskCompleted: number;
  completionRate: number;
  openIssues: number;
  feedbackTotal: number;
  noteTotal: number;
}

export interface TeamOverview {
  recruits: TeamRecruitSummary[];
  totals: {
    recruits: number;
    openIssues: number;
    completionRate: number;
  };
}

/**
 * Builds the manager/admin team overview: one progress row per overseen recruit
 * (docs/ASSUMPTIONS.md §15). Admins see all recruits; managers see the recruits
 * they oversee (§7).
 */
export async function getTeamOverview(db: Db, actor: JwtPayload): Promise<TeamOverview> {
  const where = actor.role === 'Admin' ? { role: 'Recruit' } : { managerId: actor.sub };
  const recruits = await db.user.findMany({
    where,
    orderBy: { name: 'asc' },
    select: { id: true, name: true, email: true, department: { select: { name: true } } },
  });

  const rows = await Promise.all(
    recruits.map(async (recruit): Promise<TeamRecruitSummary> => {
      const ownerWhere = { ownerId: recruit.id };
      const [tasks, issues, feedbackTotal, noteTotal] = await Promise.all([
        db.task.findMany({ where: ownerWhere, select: { status: true } }),
        db.issue.findMany({ where: ownerWhere, select: { status: true } }),
        db.feedback.count({ where: ownerWhere }),
        db.note.count({ where: ownerWhere }),
      ]);
      const taskCompleted = tasks.filter((t) => t.status === DONE_TASK_STATUS).length;
      const openIssues = issues.filter((i) =>
        OPEN_ISSUE_STATUSES.includes(i.status as never),
      ).length;
      return {
        id: recruit.id,
        name: recruit.name,
        email: recruit.email,
        department: recruit.department?.name ?? null,
        taskTotal: tasks.length,
        taskCompleted,
        completionRate: tasks.length === 0 ? 0 : Math.round((taskCompleted / tasks.length) * 100),
        openIssues,
        feedbackTotal,
        noteTotal,
      };
    }),
  );

  const taskTotal = rows.reduce((sum, r) => sum + r.taskTotal, 0);
  const completedTotal = rows.reduce((sum, r) => sum + r.taskCompleted, 0);
  return {
    recruits: rows,
    totals: {
      recruits: rows.length,
      openIssues: rows.reduce((sum, r) => sum + r.openIssues, 0),
      completionRate: taskTotal === 0 ? 0 : Math.round((completedTotal / taskTotal) * 100),
    },
  };
}
