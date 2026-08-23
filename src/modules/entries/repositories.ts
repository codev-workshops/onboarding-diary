import type { FeedbackType, IssueSeverity, IssueStatus, Prisma, TaskStatus } from '@prisma/client';

import { ownerFilter, readableUserIds, type Actor } from '@/src/modules/authz/scope';
import {
  canReadNotesOf,
  createScopedRepository,
  scopedEntryWhere,
  type DbClient,
} from '@/src/modules/entries/base-repository';
import { feedbackSelect, type FeedbackRow } from '@/src/modules/feedback/dto';
import { issueSelect, type IssueRow } from '@/src/modules/issues/dto';
import { noteSelect, type NoteRow } from '@/src/modules/notes/dto';
import { taskSelect, type TaskRow } from '@/src/modules/tasks/dto';
import { prisma } from '@/src/shared/db/prisma';

/**
 * One scoped repository per entry table. This module is the only place a Prisma
 * entry delegate is named; the ESLint boundary rule keeps it that way, so a
 * handler cannot reach past the scope predicate even by accident.
 */
export const taskRepository = createScopedRepository<
  TaskRow,
  Prisma.TaskEntryUncheckedCreateInput,
  Prisma.TaskEntryUncheckedUpdateInput,
  Prisma.TaskEntryWhereInput
>('TASK', {
  findMany: (client: DbClient, args) => client.taskEntry.findMany({ ...args, select: taskSelect }),
  findFirst: (client: DbClient, args) => client.taskEntry.findFirst({ ...args, select: taskSelect }),
  count: (client: DbClient, args) => client.taskEntry.count(args),
  create: (client: DbClient, data) => client.taskEntry.create({ data, select: taskSelect }),
  update: (client: DbClient, id, data, guard) =>
    client.taskEntry.update({ where: { id, ...guard }, data, select: taskSelect }),
});

export const issueRepository = createScopedRepository<
  IssueRow,
  Prisma.IssueEntryUncheckedCreateInput,
  Prisma.IssueEntryUncheckedUpdateInput,
  Prisma.IssueEntryWhereInput
>('ISSUE', {
  findMany: (client: DbClient, args) => client.issueEntry.findMany({ ...args, select: issueSelect }),
  findFirst: (client: DbClient, args) => client.issueEntry.findFirst({ ...args, select: issueSelect }),
  count: (client: DbClient, args) => client.issueEntry.count(args),
  create: (client: DbClient, data) => client.issueEntry.create({ data, select: issueSelect }),
  update: (client: DbClient, id, data, guard) =>
    client.issueEntry.update({ where: { id, ...guard }, data, select: issueSelect }),
});

export const feedbackRepository = createScopedRepository<
  FeedbackRow,
  Prisma.FeedbackEntryUncheckedCreateInput,
  Prisma.FeedbackEntryUncheckedUpdateInput,
  Prisma.FeedbackEntryWhereInput
>('FEEDBACK', {
  findMany: (client: DbClient, args) => client.feedbackEntry.findMany({ ...args, select: feedbackSelect }),
  findFirst: (client: DbClient, args) => client.feedbackEntry.findFirst({ ...args, select: feedbackSelect }),
  count: (client: DbClient, args) => client.feedbackEntry.count(args),
  create: (client: DbClient, data) => client.feedbackEntry.create({ data, select: feedbackSelect }),
  update: (client: DbClient, id, data, guard) =>
    client.feedbackEntry.update({ where: { id, ...guard }, data, select: feedbackSelect }),
});

export const noteRepository = createScopedRepository<
  NoteRow,
  Prisma.NoteEntryUncheckedCreateInput,
  Prisma.NoteEntryUncheckedUpdateInput,
  Prisma.NoteEntryWhereInput
>('NOTE', {
  findMany: (client: DbClient, args) => client.noteEntry.findMany({ ...args, select: noteSelect }),
  findFirst: (client: DbClient, args) => client.noteEntry.findFirst({ ...args, select: noteSelect }),
  count: (client: DbClient, args) => client.noteEntry.count(args),
  create: (client: DbClient, data) => client.noteEntry.create({ data, select: noteSelect }),
  update: (client: DbClient, id, data, guard) =>
    client.noteEntry.update({ where: { id, ...guard }, data, select: noteSelect }),
});

/**
 * How many feedback entries the report deliberately left out (§17.3). A manager
 * is told the count and nothing else: the number is what makes the omission
 * honest — a report that silently drops rows reads as complete — while subject,
 * author and body stay behind the same visibility rule as everywhere else.
 *
 * This is the one query that looks past the ADMIN_ONLY predicate, so it is
 * confined to counting, and still to owners inside `readable_user_ids(actor)`.
 */
export async function withheldFeedbackCount(
  actor: Actor,
  period: Period,
  targets: { ownerIds: string[] | null },
  types?: readonly FeedbackType[]
): Promise<number> {
  // Nothing is withheld from an admin, and a recruit's own ADMIN_ONLY feedback
  // is visible to them as its owner.
  if (actor.role === 'ADMIN') return 0;

  const readable = await readableUserIds(actor);
  const scoped = targets.ownerIds
    ? { ownerId: { in: targets.ownerIds } }
    : (ownerFilter(readable) as Prisma.FeedbackEntryWhereInput);

  return prisma.feedbackEntry.count({
    where: {
      deletedAt: null,
      visibility: 'ADMIN_ONLY',
      ownerId: { not: actor.id },
      entryDate: { gte: period.from, lte: period.to },
      // Counted over the same population as the rows that were shown, so a
      // type-filtered report cannot overstate what visibility removed.
      ...(types && types.length > 0 ? { type: { in: [...types] } } : {}),
      AND: [scoped, ownerFilter(readable) as Prisma.FeedbackEntryWhereInput],
    },
  });
}

/**
 * Dashboard aggregates.
 *
 * They live in this module for the same reason the repositories do: the
 * grouped queries below name a Prisma delegate, and the only safe place to do
 * that is behind `scopedEntryWhere`, which is the identical predicate the list
 * endpoints run under. A dashboard is an aggregate over exactly the rows the
 * caller could have listed one by one — so a manager's note counts cover their
 * own notes and nobody else's, and ADMIN_ONLY feedback is missing from their
 * totals, without any of that being restated here.
 *
 * Each function is one grouped query for the whole scope (§16.4: no per-recruit
 * query), returning `owner_id`-keyed rows the service assembles in memory.
 */
export type Period = { from: Date; to: Date };

export type OwnerCount = { ownerId: string; count: number };
export type TaskStatusCount = OwnerCount & { status: TaskStatus };
export type IssueStatusCount = OwnerCount & { status: IssueStatus; severity: IssueSeverity };
export type OwnerActivity = { ownerId: string; lastActivityAt: Date | null };

type ScopeOptions = { ownerId?: string };

const withinPeriod = (period: Period) => ({ entryDate: { gte: period.from, lte: period.to } });

export async function taskStatusCounts(
  actor: Actor,
  period: Period,
  options: ScopeOptions = {}
): Promise<TaskStatusCount[]> {
  const where = await scopedEntryWhere<Prisma.TaskEntryWhereInput>(actor, 'TASK', {
    ...options,
    filters: [withinPeriod(period)],
  });

  const rows = await prisma.taskEntry.groupBy({
    by: ['ownerId', 'status'],
    where,
    _count: { _all: true },
  });

  return rows.map((row) => ({ ownerId: row.ownerId, status: row.status, count: row._count._all }));
}

export async function issueStatusCounts(
  actor: Actor,
  period: Period,
  options: ScopeOptions = {}
): Promise<IssueStatusCount[]> {
  const where = await scopedEntryWhere<Prisma.IssueEntryWhereInput>(actor, 'ISSUE', {
    ...options,
    filters: [withinPeriod(period)],
  });

  const rows = await prisma.issueEntry.groupBy({
    by: ['ownerId', 'status', 'severity'],
    where,
    _count: { _all: true },
  });

  return rows.map((row) => ({
    ownerId: row.ownerId,
    status: row.status,
    severity: row.severity,
    count: row._count._all,
  }));
}

export async function feedbackCounts(
  actor: Actor,
  period: Period,
  options: ScopeOptions = {}
): Promise<OwnerCount[]> {
  const where = await scopedEntryWhere<Prisma.FeedbackEntryWhereInput>(actor, 'FEEDBACK', {
    ...options,
    filters: [withinPeriod(period)],
  });

  const rows = await prisma.feedbackEntry.groupBy({ by: ['ownerId'], where, _count: { _all: true } });
  return rows.map((row) => ({ ownerId: row.ownerId, count: row._count._all }));
}

export async function noteCounts(
  actor: Actor,
  period: Period,
  options: ScopeOptions = {}
): Promise<OwnerCount[]> {
  if (!canReadNotesOf(actor, options.ownerId)) return [];

  const where = await scopedEntryWhere<Prisma.NoteEntryWhereInput>(actor, 'NOTE', {
    ...options,
    filters: [withinPeriod(period)],
  });

  const rows = await prisma.noteEntry.groupBy({ by: ['ownerId'], where, _count: { _all: true } });
  return rows.map((row) => ({ ownerId: row.ownerId, count: row._count._all }));
}

/**
 * Last activity is deliberately "last activity the caller can see": it is
 * derived from the same scoped predicates, so a manager's roster cannot report
 * a timestamp that only a private note explains. It ignores the period, since
 * the point of the column is to surface a recruit who has stopped writing.
 */
export async function lastActivityByOwner(
  actor: Actor,
  options: ScopeOptions = {}
): Promise<OwnerActivity[]> {
  const [tasks, issues, feedback, notes] = await Promise.all([
    prisma.taskEntry.groupBy({
      by: ['ownerId'],
      where: await scopedEntryWhere<Prisma.TaskEntryWhereInput>(actor, 'TASK', options),
      _max: { createdAt: true },
    }),
    prisma.issueEntry.groupBy({
      by: ['ownerId'],
      where: await scopedEntryWhere<Prisma.IssueEntryWhereInput>(actor, 'ISSUE', options),
      _max: { createdAt: true },
    }),
    prisma.feedbackEntry.groupBy({
      by: ['ownerId'],
      where: await scopedEntryWhere<Prisma.FeedbackEntryWhereInput>(actor, 'FEEDBACK', options),
      _max: { createdAt: true },
    }),
    canReadNotesOf(actor, options.ownerId)
      ? prisma.noteEntry.groupBy({
          by: ['ownerId'],
          where: await scopedEntryWhere<Prisma.NoteEntryWhereInput>(actor, 'NOTE', options),
          _max: { createdAt: true },
        })
      : [],
  ]);

  const latest = new Map<string, Date>();
  for (const row of [...tasks, ...issues, ...feedback, ...notes]) {
    const seen = row._max.createdAt;
    if (!seen) continue;
    const current = latest.get(row.ownerId);
    if (!current || seen > current) latest.set(row.ownerId, seen);
  }

  return [...latest].map(([ownerId, lastActivityAt]) => ({ ownerId, lastActivityAt }));
}
