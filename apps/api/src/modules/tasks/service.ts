import type {
  CreateTaskBody,
  ListTasksQuery,
  PaginationMeta,
  TaskEntryDto,
  UpdateTaskBody,
} from '@onboarding-diary/shared';

import { assertEntryAccess, type Caller } from '../../access/entryAccess.js';
import { entryDateFilter, inFilter } from '../../lib/entryFilters.js';
import { NotFoundError } from '../../lib/errors.js';
import { buildMeta, ENTRY_ORDER_BY, toPrismaPage, type PageParams } from '../../lib/pagination.js';
import type { Db } from '../../lib/prisma.js';
import { toTaskDto } from '../../serializers/entries.js';

function toDate(entryDate: string): Date {
  return new Date(`${entryDate}T00:00:00.000Z`);
}

export async function createTask(
  db: Db,
  caller: Caller,
  body: CreateTaskBody,
): Promise<TaskEntryDto> {
  // The owner always comes from the session; a body `ownerId` is stripped by the schema.
  const task = await db.taskEntry.create({
    data: {
      ownerId: caller.id,
      entryDate: toDate(body.entryDate),
      title: body.title,
      description: body.description ?? null,
      category: body.category,
      status: body.status,
      priority: body.priority,
    },
  });
  return toTaskDto(task);
}

export async function readTask(db: Db, caller: Caller, id: string): Promise<TaskEntryDto> {
  const task = await db.taskEntry.findUnique({ where: { id } });
  if (task === null) throw new NotFoundError('Task not found');
  await assertEntryAccess(db, caller, task.ownerId, 'read');
  return toTaskDto(task);
}

export async function updateTask(
  db: Db,
  caller: Caller,
  id: string,
  body: UpdateTaskBody,
): Promise<TaskEntryDto> {
  const existing = await db.taskEntry.findUnique({ where: { id } });
  if (existing === null) throw new NotFoundError('Task not found');
  await assertEntryAccess(db, caller, existing.ownerId, 'write');

  const updated = await db.taskEntry.update({
    where: { id },
    data: {
      ...(body.entryDate === undefined ? {} : { entryDate: toDate(body.entryDate) }),
      ...(body.title === undefined ? {} : { title: body.title }),
      ...(body.description === undefined ? {} : { description: body.description }),
      ...(body.category === undefined ? {} : { category: body.category }),
      ...(body.status === undefined ? {} : { status: body.status }),
      ...(body.priority === undefined ? {} : { priority: body.priority }),
    },
  });
  return toTaskDto(updated);
}

export async function deleteTask(db: Db, caller: Caller, id: string): Promise<void> {
  const existing = await db.taskEntry.findUnique({ where: { id } });
  if (existing === null) throw new NotFoundError('Task not found');
  await assertEntryAccess(db, caller, existing.ownerId, 'write');
  await db.taskEntry.delete({ where: { id } });
}

export async function listTasks(
  db: Db,
  caller: Caller,
  query: ListTasksQuery,
  page: PageParams,
): Promise<{ data: TaskEntryDto[]; meta: PaginationMeta }> {
  const ownerId = await assertEntryAccess(db, caller, query.ownerId, 'read');
  const entryDate = entryDateFilter(query);
  const category = inFilter(query.category);
  const status = inFilter(query.status);
  const priority = inFilter(query.priority);
  const where = {
    ownerId,
    ...(entryDate === undefined ? {} : { entryDate }),
    ...(category === undefined ? {} : { category }),
    ...(status === undefined ? {} : { status }),
    ...(priority === undefined ? {} : { priority }),
  };

  const [tasks, total] = await Promise.all([
    db.taskEntry.findMany({ where, orderBy: ENTRY_ORDER_BY, ...toPrismaPage(page) }),
    db.taskEntry.count({ where }),
  ]);
  return { data: tasks.map(toTaskDto), meta: buildMeta(page, total) };
}
