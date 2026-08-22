import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import type { Actor } from '@/src/modules/authz/scope';
import { taskRepository } from '@/src/modules/entries/repositories';
import { toTaskDto, type TaskDto, type TaskRow } from '@/src/modules/tasks/dto';
import {
  createTaskSchema,
  sortColumn,
  updateTaskSchema,
  type ListTasksQuery,
} from '@/src/modules/tasks/schemas';

export type Page<T> = {
  items: T[];
  page: { page: number; page_size: number; total: number; total_pages: number };
};

/**
 * Filters are handed to the repository as a separate list; the service never
 * builds a `where` itself, because a `where` built outside the repository is a
 * `where` with no owner predicate in it.
 */
function taskFilters(query: ListTasksQuery): Prisma.TaskEntryWhereInput[] {
  const filters: Prisma.TaskEntryWhereInput[] = [];

  if (query.date_from || query.date_to) {
    filters.push({
      entryDate: {
        ...(query.date_from && { gte: query.date_from }),
        ...(query.date_to && { lte: query.date_to }),
      },
    });
  }
  if (query.status) filters.push({ status: { in: query.status } });
  if (query.category) filters.push({ category: { in: query.category } });
  if (query.priority) filters.push({ priority: { in: query.priority } });
  if (query.q) {
    filters.push({
      OR: [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ],
    });
  }

  return filters;
}

export async function listTasks(actor: Actor, query: ListTasksQuery): Promise<Page<TaskDto>> {
  const filters = taskFilters(query);
  const options = { ownerId: query.owner_id, filters };

  // `id` breaks ties so that page 2 cannot repeat or skip a row that shares an
  // entry_date with the last row of page 1 (API-6).
  const orderBy = [{ [sortColumn(query.sort)]: query.order }, { id: 'desc' as const }];

  const [rows, total] = await Promise.all([
    taskRepository.list(actor, {
      ...options,
      orderBy,
      skip: (query.page - 1) * query.page_size,
      take: query.page_size,
    }),
    taskRepository.count(actor, options),
  ]);

  return {
    items: rows.map(toTaskDto),
    page: {
      page: query.page,
      page_size: query.page_size,
      total,
      total_pages: Math.max(1, Math.ceil(total / query.page_size)),
    },
  };
}

export async function getTask(actor: Actor, id: string): Promise<TaskDto> {
  return toTaskDto(await taskRepository.findByIdOrThrow(actor, id));
}

export async function createTask(actor: Actor, body: z.infer<typeof createTaskSchema>): Promise<TaskDto> {
  const ownerId = body.owner_id ?? actor.id;

  const row = await taskRepository.create(actor, ownerId, {
    ownerId,
    entryDate: body.entry_date,
    title: body.title,
    description: body.description ?? null,
    category: body.category,
    status: body.status,
    // C1: the DB enforces "DONE implies completed_at", so a task created as
    // done is stamped now rather than rejected.
    completedAt: body.status === 'DONE' ? new Date() : null,
    updatedById: actor.id,
  });

  return toTaskDto(row);
}

export async function updateTask(
  actor: Actor,
  id: string,
  body: z.infer<typeof updateTaskSchema>
): Promise<TaskDto> {
  const row = await taskRepository.update(actor, id, body, (existing: TaskRow) => {
    const data: Prisma.TaskEntryUncheckedUpdateInput = {
      ...(body.entry_date !== undefined && { entryDate: body.entry_date }),
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description ?? null }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.priority !== undefined && { priority: body.priority }),
      version: { increment: 1 },
      updatedById: actor.id,
    };

    // Moving to DONE stamps the completion; moving away from it clears the
    // stamp, which the one-way CHECK (C1) permits and the progress metric needs.
    if (body.status !== undefined && body.status !== existing.status) {
      data.completedAt = body.status === 'DONE' ? new Date() : null;
    }

    return data;
  });

  return toTaskDto(row);
}

export async function deleteTask(actor: Actor, id: string): Promise<void> {
  await taskRepository.softDelete(actor, id, (deletedAt) => ({ deletedAt, updatedById: actor.id }));
}
