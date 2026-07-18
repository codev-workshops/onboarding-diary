import { z } from 'zod';
import type { Db } from '../../db/prisma.js';
import { ApiError } from '../../http/errors.js';

export const departmentCreateSchema = z.object({
  name: z.string().min(1).max(100),
});

export const departmentUpdateSchema = z.object({
  name: z.string().min(1).max(100),
});

export type DepartmentCreateInput = z.infer<typeof departmentCreateSchema>;
export type DepartmentUpdateInput = z.infer<typeof departmentUpdateSchema>;

export function listDepartments(db: Db) {
  return db.department.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { users: true } } },
  });
}

export async function createDepartment(db: Db, input: DepartmentCreateInput) {
  const existing = await db.department.findUnique({ where: { name: input.name } });
  if (existing) throw ApiError.conflict('A department with that name already exists');
  return db.department.create({ data: input });
}

export async function updateDepartment(db: Db, id: string, input: DepartmentUpdateInput) {
  const existing = await db.department.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Department not found');
  if (input.name !== existing.name) {
    const dup = await db.department.findUnique({ where: { name: input.name } });
    if (dup) throw ApiError.conflict('A department with that name already exists');
  }
  return db.department.update({ where: { id }, data: input });
}

export async function deleteDepartment(db: Db, id: string): Promise<void> {
  const existing = await db.department.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Department not found');
  const memberCount = await db.user.count({ where: { departmentId: id } });
  if (memberCount > 0) {
    throw ApiError.conflict('Cannot delete a department that still has members');
  }
  await db.department.delete({ where: { id } });
}
