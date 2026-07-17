import { z } from 'zod';
import type { Db } from '../../db/prisma.js';
import { ApiError } from '../../http/errors.js';
import { ROLES } from '../../domain/enums.js';
import { hashPassword } from '../../auth/password.js';
import { passwordPolicy } from '../../auth/passwordPolicy.js';
import { applyTemplateToUser, getTemplate } from '../templates/templates.service.js';

const isoDate = z.coerce.date();

export const userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  name: z.string().min(1).max(200),
  role: z.enum(ROLES),
  startDate: isoDate,
  departmentId: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
  templateId: z.string().nullable().optional(),
});

export const userUpdateSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().optional(),
  name: z.string().min(1).max(200).optional(),
  role: z.enum(ROLES).optional(),
  startDate: isoDate.optional(),
  departmentId: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;

/** User shape returned to clients — never includes the password hash. */
const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  startDate: true,
  departmentId: true,
  managerId: true,
  createdAt: true,
  updatedAt: true,
} as const;

function assertPasswordValid(password: string): void {
  const result = passwordPolicy.validate(password);
  if (!result.valid) throw ApiError.badRequest(result.errors.join(' '));
}

async function assertManagerValid(db: Db, managerId: string | null | undefined): Promise<void> {
  if (!managerId) return;
  const manager = await db.user.findUnique({ where: { id: managerId } });
  if (!manager) throw ApiError.badRequest('Assigned manager does not exist');
  if (manager.role !== 'Manager' && manager.role !== 'Admin') {
    throw ApiError.badRequest('Assigned manager must have the Manager or Admin role');
  }
}

async function assertDepartmentValid(
  db: Db,
  departmentId: string | null | undefined,
): Promise<void> {
  if (!departmentId) return;
  const dept = await db.department.findUnique({ where: { id: departmentId } });
  if (!dept) throw ApiError.badRequest('Assigned department does not exist');
}

export function listUsers(db: Db) {
  return db.user.findMany({ orderBy: { name: 'asc' }, select: publicUserSelect });
}

export async function getUser(db: Db, id: string) {
  const user = await db.user.findUnique({ where: { id }, select: publicUserSelect });
  if (!user) throw ApiError.notFound('User not found');
  return user;
}

export async function createUser(db: Db, input: UserCreateInput) {
  assertPasswordValid(input.password);
  await assertManagerValid(db, input.managerId);
  await assertDepartmentValid(db, input.departmentId);
  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.conflict('A user with that email already exists');
  // Validate the template up front so an invalid id never orphans a created user.
  if (input.templateId) await getTemplate(db, input.templateId);

  const passwordHash = await hashPassword(input.password);
  const user = await db.user.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      role: input.role,
      startDate: input.startDate,
      departmentId: input.departmentId ?? null,
      managerId: input.managerId ?? null,
    },
    select: publicUserSelect,
  });

  // Optionally seed the recruit's Task Log from a checklist template (§17).
  if (input.templateId) {
    await applyTemplateToUser(db, input.templateId, user.id);
  }

  return user;
}

export async function updateUser(db: Db, id: string, input: UserUpdateInput) {
  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('User not found');
  if (input.password !== undefined) assertPasswordValid(input.password);
  if (input.managerId !== undefined) await assertManagerValid(db, input.managerId);
  if (input.departmentId !== undefined) await assertDepartmentValid(db, input.departmentId);
  if (input.managerId && input.managerId === id) {
    throw ApiError.badRequest('A user cannot be their own manager');
  }
  if (input.email && input.email !== existing.email) {
    const dup = await db.user.findUnique({ where: { email: input.email } });
    if (dup) throw ApiError.conflict('A user with that email already exists');
  }

  const passwordHash = input.password ? await hashPassword(input.password) : undefined;
  return db.user.update({
    where: { id },
    data: {
      email: input.email,
      name: input.name,
      role: input.role,
      startDate: input.startDate,
      departmentId: input.departmentId,
      managerId: input.managerId,
      ...(passwordHash ? { passwordHash } : {}),
    },
    select: publicUserSelect,
  });
}

export async function deleteUser(db: Db, id: string): Promise<void> {
  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('User not found');
  await db.user.delete({ where: { id } });
}
