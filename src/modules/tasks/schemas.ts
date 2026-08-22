import { PriorityLevel, TaskCategory, TaskStatus } from '@prisma/client';
import { z } from 'zod';

/**
 * A calendar date with no timezone attached. `new Date('2026-02-31')` is a
 * valid Date in JavaScript (it rolls into March), so the parsed value is
 * checked against the input rather than trusted (V-3).
 */
export const entryDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the YYYY-MM-DD format.')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, 'That date does not exist.')
  .transform((value) => new Date(`${value}T00:00:00.000Z`));

const title = z.string().trim().min(3, 'Give the task a title of at least 3 characters.').max(140);
const description = z.string().trim().max(5000).nullish();

/**
 * `.strict()` is the mass-assignment defence: an unexpected key (`owner_id` on
 * a patch, `version`, `id`) fails validation instead of being ignored, so a
 * privilege-escalation attempt is a 422 rather than a silent no-op (S13).
 */
export const createTaskSchema = z
  .object({
    entry_date: entryDateSchema,
    title,
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
    title,
    description,
    category: z.nativeEnum(TaskCategory),
    status: z.nativeEnum(TaskStatus),
    priority: z.nativeEnum(PriorityLevel),
  })
  .partial()
  .strict()
  .refine((body) => Object.keys(body).length > 0, 'Provide at least one field to update.');

const csvEnum = <T extends string>(values: readonly T[]) =>
  z
    .string()
    .optional()
    .transform((value) => (value ? value.split(',').map((part) => part.trim()) : undefined))
    .pipe(
      z
        .array(z.enum(values as [T, ...T[]]))
        .nonempty()
        .optional()
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
    owner_id: z.string().uuid().optional(),
    date_from: entryDateSchema.optional(),
    date_to: entryDateSchema.optional(),
    status: csvEnum(Object.values(TaskStatus)),
    category: csvEnum(Object.values(TaskCategory)),
    priority: csvEnum(Object.values(PriorityLevel)),
    q: z.string().trim().min(1).max(140).optional(),
    page: z.coerce.number().int().min(1).default(1),
    page_size: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.enum(SORTABLE_TASK_FIELDS).default('entry_date'),
    order: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict()
  .refine(
    (query) => !query.date_from || !query.date_to || query.date_from <= query.date_to,
    'date_from must not be after date_to.'
  );

export type ListTasksQuery = z.infer<typeof listTasksSchema>;

export function sortColumn(sort: ListTasksQuery['sort']): string {
  return SORT_COLUMNS[sort];
}

export function parseListQuery(url: string): ListTasksQuery {
  return listTasksSchema.parse(Object.fromEntries(new URL(url).searchParams));
}
