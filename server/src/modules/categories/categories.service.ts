import { z } from 'zod';
import type { Db } from '../../db/prisma.js';
import { ApiError } from '../../http/errors.js';

export const categoryCreateSchema = z.object({
  name: z.string().min(1).max(100),
});

export const categoryUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;

/** Lists categories. Non-admin callers only need the active ones. */
export function listCategories(db: Db, opts: { includeInactive?: boolean } = {}) {
  return db.taskCategory.findMany({
    where: opts.includeInactive ? {} : { isActive: true },
    orderBy: { name: 'asc' },
  });
}

export async function createCategory(db: Db, input: CategoryCreateInput) {
  const existing = await db.taskCategory.findUnique({ where: { name: input.name } });
  if (existing) throw ApiError.conflict('A category with that name already exists');
  return db.taskCategory.create({ data: { name: input.name } });
}

export async function updateCategory(db: Db, id: string, input: CategoryUpdateInput) {
  const existing = await db.taskCategory.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Category not found');
  if (input.name && input.name !== existing.name) {
    const dup = await db.taskCategory.findUnique({ where: { name: input.name } });
    if (dup) throw ApiError.conflict('A category with that name already exists');
  }
  return db.taskCategory.update({ where: { id }, data: input });
}

/**
 * Deletes a category. If it is still referenced by tasks, it is soft-disabled
 * (archived) rather than hard-deleted, to avoid orphaning entries
 * (docs/ASSUMPTIONS.md §4).
 */
export async function deleteCategory(
  db: Db,
  id: string,
): Promise<{ softDisabled: boolean }> {
  const existing = await db.taskCategory.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Category not found');
  const inUse = await db.task.count({ where: { categoryId: id } });
  if (inUse > 0) {
    await db.taskCategory.update({ where: { id }, data: { isActive: false } });
    return { softDisabled: true };
  }
  await db.taskCategory.delete({ where: { id } });
  return { softDisabled: false };
}
