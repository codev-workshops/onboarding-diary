import { z } from 'zod';
import type { Db } from '../../db/prisma.js';
import type { JwtPayload } from '../../auth/jwt.js';
import { accessibleOwnerIds, assertCanAccessOwner, ownerFilter } from '../../access/scope.js';
import { ApiError } from '../../http/errors.js';
import { TASK_PRIORITIES, TASK_STATUSES } from '../../domain/enums.js';

const isoDate = z.coerce.date();

export const taskCreateSchema = z.object({
  date: isoDate,
  title: z.string().min(1).max(200),
  description: z.string().max(5000).default(''),
  categoryId: z.string().min(1),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
});

export const taskUpdateSchema = taskCreateSchema.partial();

export const taskFilterSchema = z.object({
  date: isoDate.optional(),
  categoryId: z.string().optional(),
  status: z.enum(TASK_STATUSES).optional(),
});

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type TaskFilter = z.infer<typeof taskFilterSchema>;

/** Returns the [start, end) bounds for a single calendar day (UTC). */
function dayRange(date: Date): { gte: Date; lt: Date } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { gte: start, lt: end };
}

async function assertCategoryUsable(db: Db, categoryId: string): Promise<void> {
  const category = await db.taskCategory.findUnique({ where: { id: categoryId } });
  if (!category || !category.isActive) {
    throw ApiError.badRequest('Invalid or inactive task category');
  }
}

export async function listTasks(db: Db, actor: JwtPayload, filter: TaskFilter) {
  const ids = await accessibleOwnerIds(db, actor);
  return db.task.findMany({
    where: {
      ...ownerFilter(ids),
      ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.date ? { date: dayRange(filter.date) } : {}),
    },
    include: { category: true },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function getTask(db: Db, actor: JwtPayload, id: string) {
  const task = await db.task.findUnique({ where: { id }, include: { category: true } });
  if (!task) throw ApiError.notFound('Task not found');
  const ids = await accessibleOwnerIds(db, actor);
  assertCanAccessOwner(ids, task.ownerId);
  return task;
}

export async function createTask(db: Db, actor: JwtPayload, input: TaskCreateInput) {
  await assertCategoryUsable(db, input.categoryId);
  return db.task.create({
    data: { ...input, ownerId: actor.sub },
    include: { category: true },
  });
}

export async function updateTask(db: Db, actor: JwtPayload, id: string, input: TaskUpdateInput) {
  await getTask(db, actor, id); // access check + existence
  if (input.categoryId) await assertCategoryUsable(db, input.categoryId);
  return db.task.update({ where: { id }, data: input, include: { category: true } });
}

export async function deleteTask(db: Db, actor: JwtPayload, id: string): Promise<void> {
  await getTask(db, actor, id); // access check + existence
  await db.task.delete({ where: { id } });
}
