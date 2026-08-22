import { prisma } from '@/src/shared/db/prisma';

export type DepartmentOption = { id: string; name: string };

export function listActiveDepartments(): Promise<DepartmentOption[]> {
  return prisma.department.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });
}
