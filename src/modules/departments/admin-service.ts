import { Prisma } from '@prisma/client';

import { recordAudit } from '@/src/modules/audit/service';
import { notFound } from '@/src/modules/authz/errors';
import { assertRole } from '@/src/modules/authz/policy';
import type { Actor } from '@/src/modules/authz/scope';
import type { CreateDepartmentInput, UpdateDepartmentInput } from '@/src/modules/departments/schemas';
import { prisma } from '@/src/shared/db/prisma';
import { AppError } from '@/src/shared/http/errors';

export type DepartmentView = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  member_count: number;
};

const departmentSelect = {
  id: true,
  name: true,
  description: true,
  isActive: true,
  _count: { select: { users: true } },
} satisfies Prisma.DepartmentSelect;

type DepartmentRow = Prisma.DepartmentGetPayload<{ select: typeof departmentSelect }>;

function toDepartment(row: DepartmentRow): DepartmentView {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    is_active: row.isActive,
    member_count: row._count.users,
  };
}

/**
 * The admin list, unlike the public one, includes deactivated departments and
 * the member counts — deactivating a department is only an informed decision if
 * the admin can see how many people are in it (F-A4).
 */
export async function listDepartmentsForAdmin(
  actor: Actor,
  includeInactive: boolean
): Promise<DepartmentView[]> {
  assertRole(actor, ['ADMIN']);

  const departments = await prisma.department.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [{ name: 'asc' }],
    select: departmentSelect,
  });

  return departments.map(toDepartment);
}

export async function createDepartment(actor: Actor, input: CreateDepartmentInput): Promise<DepartmentView> {
  assertRole(actor, ['ADMIN']);

  try {
    const department = await prisma.$transaction(async (tx) => {
      const created = await tx.department.create({
        data: { name: input.name, description: input.description ?? null },
        select: departmentSelect,
      });

      await recordAudit(
        {
          action: 'DEPARTMENT.CREATED',
          entityType: 'DEPARTMENT',
          entityId: created.id,
          after: { name: created.name },
        },
        tx
      );

      return created;
    });

    return toDepartment(department);
  } catch (error) {
    throw translateDuplicateName(error);
  }
}

/**
 * Rename, re-describe, deactivate or reactivate. Deactivation is recorded under
 * its own action because it changes what new users may be assigned to, which is
 * a policy change rather than an edit.
 */
export async function updateDepartment(
  actor: Actor,
  departmentId: string,
  input: UpdateDepartmentInput
): Promise<DepartmentView> {
  assertRole(actor, ['ADMIN']);

  const before = await prisma.department.findUnique({
    where: { id: departmentId },
    select: departmentSelect,
  });
  if (!before) throw notFound();

  try {
    const after = await prisma.$transaction(async (tx) => {
      const updated = await tx.department.update({
        where: { id: departmentId },
        data: { name: input.name, description: input.description, isActive: input.is_active },
        select: departmentSelect,
      });

      if (before.isActive !== updated.isActive) {
        await recordAudit(
          {
            action: updated.isActive ? 'DEPARTMENT.UPDATED' : 'DEPARTMENT.DEACTIVATED',
            entityType: 'DEPARTMENT',
            entityId: departmentId,
            before: { is_active: before.isActive },
            after: { is_active: updated.isActive, member_count: updated._count.users },
          },
          tx
        );
      }

      if (before.name !== updated.name || before.description !== updated.description) {
        await recordAudit(
          {
            action: 'DEPARTMENT.UPDATED',
            entityType: 'DEPARTMENT',
            entityId: departmentId,
            before: { name: before.name },
            after: { name: updated.name },
          },
          tx
        );
      }

      return updated;
    });

    return toDepartment(after);
  } catch (error) {
    throw translateDuplicateName(error);
  }
}

/**
 * US-73: a department with members is never deleted — the users' history hangs
 * off it — so the only hard delete is of an empty one, and everything else is
 * refused with `409 DEPARTMENT_IN_USE` pointing at deactivation instead.
 */
export async function deleteDepartment(actor: Actor, departmentId: string): Promise<void> {
  assertRole(actor, ['ADMIN']);

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
    select: departmentSelect,
  });
  if (!department) throw notFound();

  if (department._count.users > 0) {
    throw new AppError(
      'DEPARTMENT_IN_USE',
      `${department._count.users} user${department._count.users === 1 ? ' is' : 's are'} assigned to this department. Deactivate it instead.`,
      [{ field: 'id', code: 'DEPARTMENT_IN_USE', message: String(department._count.users) }]
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.department.delete({ where: { id: departmentId } });
    await recordAudit(
      {
        action: 'DEPARTMENT.DELETED',
        entityType: 'DEPARTMENT',
        entityId: departmentId,
        before: { name: department.name },
      },
      tx
    );
  });
}

function translateDuplicateName(error: unknown): unknown {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return new AppError('VALIDATION_ERROR', 'The request contains invalid fields.', [
      { field: 'name', code: 'DUPLICATE', message: 'A department with that name already exists.' },
    ]);
  }
  return error;
}
