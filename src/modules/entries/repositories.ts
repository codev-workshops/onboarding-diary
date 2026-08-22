import type { Prisma } from '@prisma/client';

import { createScopedRepository, type DbClient } from '@/src/modules/entries/base-repository';
import { taskSelect, type TaskRow } from '@/src/modules/tasks/dto';

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
  update: (client: DbClient, id, data) =>
    client.taskEntry.update({ where: { id }, data, select: taskSelect }),
});

/**
 * Issues, feedback and notes are read-closed here and gain their DTOs, services
 * and endpoints in M5–M6. The identity projection is enough for the
 * authorization matrix and for anything M4 needs to count.
 */
const identitySelect = { id: true, ownerId: true } satisfies Prisma.IssueEntrySelect;

type IdentityRow = { id: string; ownerId: string };

export const issueRepository = createScopedRepository<
  IdentityRow,
  Prisma.IssueEntryUncheckedCreateInput,
  Prisma.IssueEntryUncheckedUpdateInput,
  Prisma.IssueEntryWhereInput
>('ISSUE', {
  findMany: (client: DbClient, args) => client.issueEntry.findMany({ ...args, select: identitySelect }),
  findFirst: (client: DbClient, args) => client.issueEntry.findFirst({ ...args, select: identitySelect }),
  count: (client: DbClient, args) => client.issueEntry.count(args),
  create: (client: DbClient, data) => client.issueEntry.create({ data, select: identitySelect }),
  update: (client: DbClient, id, data) =>
    client.issueEntry.update({ where: { id }, data, select: identitySelect }),
});

export const feedbackRepository = createScopedRepository<
  IdentityRow,
  Prisma.FeedbackEntryUncheckedCreateInput,
  Prisma.FeedbackEntryUncheckedUpdateInput,
  Prisma.FeedbackEntryWhereInput
>('FEEDBACK', {
  findMany: (client: DbClient, args) => client.feedbackEntry.findMany({ ...args, select: identitySelect }),
  findFirst: (client: DbClient, args) => client.feedbackEntry.findFirst({ ...args, select: identitySelect }),
  count: (client: DbClient, args) => client.feedbackEntry.count(args),
  create: (client: DbClient, data) => client.feedbackEntry.create({ data, select: identitySelect }),
  update: (client: DbClient, id, data) =>
    client.feedbackEntry.update({ where: { id }, data, select: identitySelect }),
});

export const noteRepository = createScopedRepository<
  IdentityRow,
  Prisma.NoteEntryUncheckedCreateInput,
  Prisma.NoteEntryUncheckedUpdateInput,
  Prisma.NoteEntryWhereInput
>('NOTE', {
  findMany: (client: DbClient, args) => client.noteEntry.findMany({ ...args, select: identitySelect }),
  findFirst: (client: DbClient, args) => client.noteEntry.findFirst({ ...args, select: identitySelect }),
  count: (client: DbClient, args) => client.noteEntry.count(args),
  create: (client: DbClient, data) => client.noteEntry.create({ data, select: identitySelect }),
  update: (client: DbClient, id, data) =>
    client.noteEntry.update({ where: { id }, data, select: identitySelect }),
});
