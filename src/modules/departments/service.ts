import { prisma } from '@/src/shared/db/prisma';

export type DepartmentOption = { id: string; name: string };

/** One department by id, including a deactivated one: a report about its members is still legitimate. */
export function getDepartment(id: string): Promise<DepartmentOption | null> {
  return prisma.department.findUnique({ where: { id }, select: { id: true, name: true } });
}

export function listActiveDepartments(): Promise<DepartmentOption[]> {
  return prisma.department.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
}
