import type { Prisma } from '@prisma/client';

import { createScopedRepository, type DbClient } from '@/src/modules/entries/base-repository';
import { feedbackSelect, type FeedbackRow } from '@/src/modules/feedback/dto';
import { issueSelect, type IssueRow } from '@/src/modules/issues/dto';
import { noteSelect, type NoteRow } from '@/src/modules/notes/dto';
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
