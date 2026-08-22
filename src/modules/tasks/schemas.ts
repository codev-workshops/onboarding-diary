import { PriorityLevel, TaskCategory, TaskStatus } from '@prisma/client';
import { z } from 'zod';

import {
  csvEnum,
  entryDateSchema,
  entryTitleSchema,
  expectedVersionSchema,
  listRangeFields,
  orderedDateRange,
  paginationFields,
  parseQuery,
} from '@/src/modules/entries/schemas';

const description = z.string().trim().max(5000).nullish();

/**
 * `.strict()` is the mass-assignment defence: an unexpected key (`owner_id` on
 * a patch, `version`, `id`) fails validation instead of being ignored, so a
 * privilege-escalation attempt is a 422 rather than a silent no-op (S13).
 */
export const createTaskSchema = z
  .object({
    entry_date: entryDateSchema,
    title: entryTitleSchema,
    description: description,
    category: z.nativeEnum(TaskCategory).default('OTHER'),
    status: z.nativeEnum(TaskStatus).default('TODO'),
    priority: z.nativeEnum(PriorityLevel).default('MEDIUM'),
    owner_id: z.string().uuid().optional(),
  })
  .strict();

export const updateTaskSchema = z
  .object({
    entry_date: entryDateSchema,
    title: entryTitleSchema,
    description,
    category: z.nativeEnum(TaskCategory),
    status: z.nativeEnum(TaskStatus),
    priority: z.nativeEnum(PriorityLevel),
    expected_version: expectedVersionSchema,
  })
  .partial()
  .strict()
  .refine(
    (body) => Object.keys(body).some((key) => key !== 'expected_version'),
    'Provide at least one field to update.'
  );

export const SORTABLE_TASK_FIELDS = ['entry_date', 'created_at', 'updated_at', 'priority', 'status'] as const;

const SORT_COLUMNS: Record<(typeof SORTABLE_TASK_FIELDS)[number], string> = {
  entry_date: 'entryDate',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  priority: 'priority',
  status: 'status',
};

/**
 * Sorting is an allow-list mapped to column names, never a pass-through of the
 * query string into `orderBy` (API-8).
 */
export const listTasksSchema = z
  .object({
    ...listRangeFields,
    ...paginationFields,
    status: csvEnum(Object.values(TaskStatus)),
    category: csvEnum(Object.values(TaskCategory)),
    priority: csvEnum(Object.values(PriorityLevel)),
    sort: z.enum(SORTABLE_TASK_FIELDS).default('entry_date'),
  })
  .strict()
  .refine(orderedDateRange, 'date_from must not be after date_to.');

export type ListTasksQuery = z.infer<typeof listTasksSchema>;

export function sortColumn(sort: ListTasksQuery['sort']): string {
  return SORT_COLUMNS[sort];
}

export function parseListQuery(url: string): ListTasksQuery {
  return parseQuery(listTasksSchema, url);
}
