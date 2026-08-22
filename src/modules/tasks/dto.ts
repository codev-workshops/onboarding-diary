import type { Prisma, PriorityLevel, TaskCategory, TaskStatus } from '@prisma/client';

/**
 * The owner is embedded by name only. A task list is the first place a manager
 * sees other users, and SEC-18 keeps other users' email addresses out of every
 * manager-facing payload.
 */
export const taskSelect = {
  id: true,
  ownerId: true,
  entryDate: true,
  title: true,
  description: true,
  category: true,
  status: true,
  priority: true,
  completedAt: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: { id: true, fullName: true } },
  updatedBy: { select: { id: true, fullName: true } },
} satisfies Prisma.TaskEntrySelect;

export type TaskRow = Prisma.TaskEntryGetPayload<{ select: typeof taskSelect }>;

export type TaskDto = {
  id: string;
  owner: { id: string; full_name: string };
  entry_date: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  status: TaskStatus;
  priority: PriorityLevel;
  completed_at: string | null;
  version: number;
  created_at: string;
  updated_at: string;
  updated_by: { id: string; full_name: string };
};

export function toTaskDto(task: TaskRow): TaskDto {
  return {
    id: task.id,
    owner: { id: task.owner.id, full_name: task.owner.fullName },
    entry_date: task.entryDate.toISOString().slice(0, 10),
    title: task.title,
    description: task.description,
    category: task.category,
    status: task.status,
    priority: task.priority,
    completed_at: task.completedAt?.toISOString() ?? null,
    version: task.version,
    created_at: task.createdAt.toISOString(),
    updated_at: task.updatedAt.toISOString(),
    updated_by: { id: task.updatedBy.id, full_name: task.updatedBy.fullName },
  };
}
