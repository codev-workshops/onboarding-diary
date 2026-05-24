import type { Prisma } from '@prisma/client';
import type {
  ManagerRecruitAssignmentDto,
  AssignManagerSchema,
  PaginatedResponse,
} from '@onboarding-diary/shared';
import { prisma } from '../../config/database.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../errors/AppError.js';

function toAssignmentDto(rel: {
  id: string;
  assignedAt: Date;
  unassignedAt: Date | null;
  isActive: boolean;
  notes: string | null;
  manager: { id: string; email: string; firstName: string; lastName: string };
  recruit: { id: string; email: string; firstName: string; lastName: string };
}): ManagerRecruitAssignmentDto {
  return {
    id: rel.id,
    manager: {
      id: rel.manager.id,
      email: rel.manager.email,
      first_name: rel.manager.firstName,
      last_name: rel.manager.lastName,
    },
    recruit: {
      id: rel.recruit.id,
      email: rel.recruit.email,
      first_name: rel.recruit.firstName,
      last_name: rel.recruit.lastName,
    },
    assigned_at: rel.assignedAt.toISOString(),
    unassigned_at: rel.unassignedAt?.toISOString() ?? null,
    is_active: rel.isActive,
    notes: rel.notes,
  };
}

const includeUsers = {
  manager: { select: { id: true, email: true, firstName: true, lastName: true } },
  recruit: { select: { id: true, email: true, firstName: true, lastName: true } },
} as const;

export async function assignManager(input: AssignManagerSchema): Promise<ManagerRecruitAssignmentDto> {
  const [manager, recruit] = await prisma.$transaction([
    prisma.user.findUnique({ where: { id: input.manager_id, deletedAt: null } }),
    prisma.user.findUnique({ where: { id: input.recruit_id, deletedAt: null } }),
  ]);

  if (!manager) {
    throw new NotFoundError('Manager');
  }
  if (!recruit) {
    throw new NotFoundError('Recruit');
  }

  if (manager.role !== 'MANAGER' && manager.role !== 'ADMIN') {
    throw new BadRequestError('The specified user does not have a MANAGER or ADMIN role');
  }

  if (recruit.role !== 'RECRUIT') {
    throw new BadRequestError('The specified user does not have a RECRUIT role');
  }

  if (input.manager_id === input.recruit_id) {
    throw new BadRequestError('A user cannot be assigned as their own manager');
  }

  const existing = await prisma.managerRecruitRelationship.findFirst({
    where: {
      managerId: input.manager_id,
      recruitId: input.recruit_id,
      isActive: true,
    },
  });

  if (existing) {
    throw new ConflictError('This manager-recruit assignment already exists');
  }

  const rel = await prisma.managerRecruitRelationship.create({
    data: {
      managerId: input.manager_id,
      recruitId: input.recruit_id,
      notes: input.notes,
    },
    include: includeUsers,
  });

  return toAssignmentDto(rel);
}

export async function unassignManager(
  assignmentId: string,
  notes?: string,
): Promise<ManagerRecruitAssignmentDto> {
  const rel = await prisma.managerRecruitRelationship.findUnique({
    where: { id: assignmentId },
    include: includeUsers,
  });

  if (!rel) {
    throw new NotFoundError('Assignment');
  }

  if (!rel.isActive) {
    throw new BadRequestError('This assignment is already inactive');
  }

  const updated = await prisma.managerRecruitRelationship.update({
    where: { id: assignmentId },
    data: {
      isActive: false,
      unassignedAt: new Date(),
      ...(notes !== undefined ? { notes } : {}),
    },
    include: includeUsers,
  });

  return toAssignmentDto(updated);
}

export async function listAssignments(query: {
  page: number;
  limit: number;
  manager_id?: string;
  recruit_id?: string;
  is_active?: boolean;
}): Promise<PaginatedResponse<ManagerRecruitAssignmentDto>> {
  const { page, limit, manager_id, recruit_id, is_active } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ManagerRecruitRelationshipWhereInput = {
    ...(manager_id ? { managerId: manager_id } : {}),
    ...(recruit_id ? { recruitId: recruit_id } : {}),
    ...(is_active !== undefined ? { isActive: is_active } : {}),
  };

  const [assignments, totalCount] = await prisma.$transaction([
    prisma.managerRecruitRelationship.findMany({
      where,
      include: includeUsers,
      orderBy: { assignedAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.managerRecruitRelationship.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return {
    data: assignments.map(toAssignmentDto),
    meta: {
      page,
      limit,
      total_count: totalCount,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
    },
  };
}

export async function getAssignmentById(id: string): Promise<ManagerRecruitAssignmentDto> {
  const rel = await prisma.managerRecruitRelationship.findUnique({
    where: { id },
    include: includeUsers,
  });

  if (!rel) {
    throw new NotFoundError('Assignment');
  }

  return toAssignmentDto(rel);
}

export async function getRecruitsForManager(managerId: string): Promise<ManagerRecruitAssignmentDto[]> {
  const assignments = await prisma.managerRecruitRelationship.findMany({
    where: { managerId, isActive: true },
    include: includeUsers,
    orderBy: { assignedAt: 'desc' },
  });

  return assignments.map(toAssignmentDto);
}

export async function getManagersForRecruit(recruitId: string): Promise<ManagerRecruitAssignmentDto[]> {
  const assignments = await prisma.managerRecruitRelationship.findMany({
    where: { recruitId, isActive: true },
    include: includeUsers,
    orderBy: { assignedAt: 'desc' },
  });

  return assignments.map(toAssignmentDto);
}
