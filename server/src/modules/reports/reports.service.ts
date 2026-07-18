import { z } from 'zod';
import type { Db } from '../../db/prisma.js';
import type { JwtPayload } from '../../auth/jwt.js';
import { accessibleOwnerIds } from '../../access/scope.js';
import { ApiError } from '../../http/errors.js';
import { DONE_TASK_STATUS, OPEN_ISSUE_STATUSES } from '../../domain/enums.js';

export const reportQuerySchema = z
  .object({
    start: z.coerce.date(),
    end: z.coerce.date(),
    recruitId: z.string().optional(),
  })
  .refine((v) => v.start <= v.end, { message: 'start must be on or before end' });

export type ReportQuery = z.infer<typeof reportQuerySchema>;

export interface ReportTask {
  date: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  owner: string;
}
export interface ReportIssue {
  date: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  resolutionNotes: string;
  owner: string;
}
export interface ReportFeedback {
  date: string;
  subject: string;
  type: string;
  details: string;
  owner: string;
}
export interface ReportNote {
  date: string;
  title: string;
  content: string;
  tags: string;
  owner: string;
}

export interface ReportData {
  meta: {
    start: string;
    end: string;
    generatedAt: string;
    generatedBy: string;
    scope: string;
  };
  summary: {
    taskTotal: number;
    taskCompleted: number;
    issueTotal: number;
    issueOpen: number;
    feedbackTotal: number;
    noteTotal: number;
  };
  tasks: ReportTask[];
  issues: ReportIssue[];
  feedback: ReportFeedback[];
  notes: ReportNote[];
}

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Owner label with a visible cue when the user has been deactivated (§10). */
function ownerLabel(owner: { name: string; isActive: boolean }): string {
  return owner.isActive ? owner.name : `${owner.name} (deactivated)`;
}

function rangeFilter(start: Date, end: Date): { gte: Date; lte: Date } {
  const gte = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const lte = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), 23, 59, 59, 999),
  );
  return { gte, lte };
}

/**
 * Assembles the report shown on screen and exported to PDF/CSV
 * (docs/ASSUMPTIONS.md §11). Scoped by role (§7); managers/admins may focus on a
 * single recruit within their scope via `recruitId`.
 */
export async function buildReport(
  db: Db,
  actor: JwtPayload,
  query: ReportQuery,
): Promise<ReportData> {
  const ids = await accessibleOwnerIds(db, actor);

  let ownerIds = ids;
  let scope: string;
  if (query.recruitId) {
    if (ids !== null && !ids.includes(query.recruitId)) {
      throw ApiError.forbidden('You do not oversee this recruit');
    }
    ownerIds = [query.recruitId];
    const recruit = await db.user.findUnique({ where: { id: query.recruitId } });
    scope = recruit ? `Recruit: ${recruit.name}` : 'Recruit';
  } else {
    scope =
      actor.role === 'Admin'
        ? 'All recruits'
        : actor.role === 'Manager'
          ? 'Overseen recruits'
          : 'My entries';
  }

  const ownerWhere = ownerIds === null ? {} : { ownerId: { in: ownerIds } };
  const dateWhere = { date: rangeFilter(query.start, query.end) };
  const where = { ...ownerWhere, ...dateWhere };

  const [tasks, issues, feedback, notes] = await Promise.all([
    db.task.findMany({
      where,
      include: { category: true, owner: { select: { name: true, isActive: true } } },
      orderBy: { date: 'asc' },
    }),
    db.issue.findMany({
      where,
      include: { owner: { select: { name: true, isActive: true } } },
      orderBy: { date: 'asc' },
    }),
    db.feedback.findMany({
      where,
      include: { owner: { select: { name: true, isActive: true } } },
      orderBy: { date: 'asc' },
    }),
    db.note.findMany({
      where,
      include: { owner: { select: { name: true, isActive: true } } },
      orderBy: { date: 'asc' },
    }),
  ]);

  const taskRows: ReportTask[] = tasks.map((t) => ({
    date: dateOnly(t.date),
    title: t.title,
    description: t.description,
    category: t.category.name,
    status: t.status,
    priority: t.priority,
    owner: ownerLabel(t.owner),
  }));
  const issueRows: ReportIssue[] = issues.map((i) => ({
    date: dateOnly(i.date),
    title: i.title,
    description: i.description,
    severity: i.severity,
    status: i.status,
    resolutionNotes: i.resolutionNotes ?? '',
    owner: ownerLabel(i.owner),
  }));
  const feedbackRows: ReportFeedback[] = feedback.map((f) => ({
    date: dateOnly(f.date),
    subject: f.subject,
    type: f.type,
    details: f.details,
    owner: ownerLabel(f.owner),
  }));
  const noteRows: ReportNote[] = notes.map((n) => {
    let tags = '';
    try {
      const parsed: unknown = JSON.parse(n.tags);
      if (Array.isArray(parsed)) tags = parsed.join(', ');
    } catch {
      tags = '';
    }
    return {
      date: dateOnly(n.date),
      title: n.title,
      content: n.content,
      tags,
      owner: ownerLabel(n.owner),
    };
  });

  return {
    meta: {
      start: dateOnly(query.start),
      end: dateOnly(query.end),
      generatedAt: new Date().toISOString(),
      generatedBy: actor.name,
      scope,
    },
    summary: {
      taskTotal: taskRows.length,
      taskCompleted: taskRows.filter((t) => t.status === DONE_TASK_STATUS).length,
      issueTotal: issueRows.length,
      issueOpen: issueRows.filter((i) => OPEN_ISSUE_STATUSES.includes(i.status as never)).length,
      feedbackTotal: feedbackRows.length,
      noteTotal: noteRows.length,
    },
    tasks: taskRows,
    issues: issueRows,
    feedback: feedbackRows,
    notes: noteRows,
  };
}
