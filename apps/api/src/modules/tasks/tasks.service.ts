import type { Prisma } from '@prisma/client';
import type {
  TaskEntryDto,
  CreateTaskEntrySchema,
  UpdateTaskEntrySchema,
  TaskListParamsSchema,
  PaginatedResponse,
} from '@onboarding-diary/shared';
import { Role } from '@onboarding-diary/shared';
import { prisma } from '../../config/database.js';
import { ForbiddenError, NotFoundError } from '../../errors/AppError.js';

function toTaskDto(task: {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  dueDate: Date | null;
  completedAt: Date | null;
  visibility: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}): TaskEntryDto {
  return {
    id: task.id,
    user_id: task.userId,
    title: task.title,
    description: task.description,
    priority: task.priority as TaskEntryDto['priority'],
    status: task.status as TaskEntryDto['status'],
    due_date: task.dueDate?.toISOString() ?? null,
    completed_at: task.completedAt?.toISOString() ?? null,
    visibility: task.visibility as TaskEntryDto['visibility'],
    tags: task.tags,
    created_at: task.createdAt.toISOString(),
    updated_at: task.updatedAt.toISOString(),
  };
}

const SORT_FIELD_MAP: Record<string, string> = {
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  due_date: 'dueDate',
  priority: 'priority',
  status: 'status',
  title: 'title',
};

/**
 * Checks whether the requester can access a task based on ownership and role.
 * - RECRUIT: own tasks only
 * - MANAGER: own tasks + tasks of assigned recruits (visibility >= MANAGER_ONLY)
 * - ADMIN: all tasks
 */
async function assertTaskAccess(
  task: { userId: string; visibility: string },
  requesterId: string,
  requesterRole: Role,
): Promise<void> {
  if (requesterRole === Role.ADMIN) return;
  if (task.userId === requesterId) return;

  if (requesterRole === Role.MANAGER) {
    const assignment = await prisma.managerRecruitRelationship.findFirst({
      where: { managerId: requesterId, recruitId: task.userId, isActive: true },
    });
    if (assignment && task.visibility !== 'PRIVATE') return;
  }

  throw new ForbiddenError('You do not have permission to access this task');
}

export async function createTask(
  userId: string,
  input: CreateTaskEntrySchema,
): Promise<TaskEntryDto> {
  const task = await prisma.taskEntry.create({
    data: {
      userId,
      title: input.title,
      description: input.description,
      priority: input.priority,
      dueDate: input.due_date ? new Date(input.due_date) : undefined,
      visibility: input.visibility,
      tags: input.tags ?? [],
    },
  });

  return toTaskDto(task);
}

export async function updateTask(
  taskId: string,
  input: UpdateTaskEntrySchema,
  requesterId: string,
  requesterRole: Role,
): Promise<TaskEntryDto> {
  const task = await prisma.taskEntry.findUnique({
    where: { id: taskId, deletedAt: null },
  });

  if (!task) {
    throw new NotFoundError('Task');
  }

  // Only task owner or ADMIN can edit
  if (task.userId !== requesterId && requesterRole !== Role.ADMIN) {
    throw new ForbiddenError('You can only edit your own tasks');
  }

  const data: Prisma.TaskEntryUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.priority !== undefined) data.priority = input.priority;
  if (input.status !== undefined) {
    data.status = input.status;
    if (input.status === 'COMPLETED') {
      data.completedAt = new Date();
    } else {
      data.completedAt = null;
    }
  }
  if (input.due_date !== undefined) data.dueDate = input.due_date ? new Date(input.due_date) : null;
  if (input.visibility !== undefined) data.visibility = input.visibility;
  if (input.tags !== undefined) data.tags = input.tags;

  const updated = await prisma.taskEntry.update({
    where: { id: taskId },
    data,
  });

  return toTaskDto(updated);
}

export async function deleteTask(
  taskId: string,
  requesterId: string,
  requesterRole: Role,
): Promise<void> {
  const task = await prisma.taskEntry.findUnique({
    where: { id: taskId, deletedAt: null },
  });

  if (!task) {
    throw new NotFoundError('Task');
  }

  if (task.userId !== requesterId && requesterRole !== Role.ADMIN) {
    throw new ForbiddenError('You can only delete your own tasks');
  }

  await prisma.taskEntry.update({
    where: { id: taskId },
    data: { deletedAt: new Date() },
  });
}

export async function getTaskById(
  taskId: string,
  requesterId: string,
  requesterRole: Role,
): Promise<TaskEntryDto> {
  const task = await prisma.taskEntry.findUnique({
    where: { id: taskId, deletedAt: null },
  });

  if (!task) {
    throw new NotFoundError('Task');
  }

  await assertTaskAccess(task, requesterId, requesterRole);

  return toTaskDto(task);
}

export async function listTasks(
  query: TaskListParamsSchema,
  requesterId: string,
  requesterRole: Role,
): Promise<PaginatedResponse<TaskEntryDto>> {
  const { page, limit, sort_by, sort_order, status, priority, visibility, from_date, to_date, tag, q } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.TaskEntryWhereInput = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(visibility ? { visibility } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
    ...(from_date || to_date
      ? {
          createdAt: {
            ...(from_date ? { gte: new Date(from_date) } : {}),
            ...(to_date ? { lte: new Date(to_date + 'T23:59:59.999Z') } : {}),
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  // Scope by role
  if (requesterRole === Role.RECRUIT) {
    where.userId = requesterId;
  } else if (requesterRole === Role.MANAGER) {
    const assignments = await prisma.managerRecruitRelationship.findMany({
      where: { managerId: requesterId, isActive: true },
      select: { recruitId: true },
    });
    const recruitIds = assignments.map((a) => a.recruitId);

    where.OR = [
      { userId: requesterId },
      {
        userId: { in: recruitIds },
        visibility: { not: 'PRIVATE' },
      },
    ];

    // Merge with existing text search OR if present
    if (q) {
      const textFilter = {
        OR: [
          { title: { contains: q, mode: 'insensitive' as const } },
          { description: { contains: q, mode: 'insensitive' as const } },
        ],
      };
      where.AND = [
        textFilter,
        {
          OR: [
            { userId: requesterId },
            { userId: { in: recruitIds }, visibility: { not: 'PRIVATE' } },
          ],
        },
      ];
      delete where.OR;
    }
  }
  // ADMIN: no additional scoping

  const orderBy: Prisma.TaskEntryOrderByWithRelationInput = {
    [SORT_FIELD_MAP[sort_by] ?? 'createdAt']: sort_order,
  };

  const [tasks, totalCount] = await prisma.$transaction([
    prisma.taskEntry.findMany({ where, orderBy, skip, take: limit }),
    prisma.taskEntry.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  return {
    data: tasks.map(toTaskDto),
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
