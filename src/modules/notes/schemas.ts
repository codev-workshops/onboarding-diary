import { z } from 'zod';

import {
  entryDateSchema,
  entryTitleSchema,
  expectedVersionSchema,
  listRangeFields,
  orderedDateRange,
  paginationFields,
  parseQuery,
} from '@/src/modules/entries/schemas';

const content = z.string().trim().min(1).max(20000);

/**
 * Tags are normalised to lower case and de-duplicated so that `#Onboarding` and
 * `#onboarding` are one tag, and capped at 10 to match the DB constraint.
 */
const tags = z
  .array(z.string().trim().min(1).max(30))
  .max(10, 'A note may carry at most 10 tags.')
  .transform((values) => Array.from(new Set(values.map((value) => value.toLowerCase()))))
  .default([]);

export const createNoteSchema = z
  .object({
    entry_date: entryDateSchema,
    title: entryTitleSchema,
    content,
    tags,
    owner_id: z.string().uuid().optional(),
  })
  .strict();

export const updateNoteSchema = z
  .object({
    entry_date: entryDateSchema,
    title: entryTitleSchema,
    content,
    tags,
    expected_version: expectedVersionSchema,
  })
  .partial()
  .strict()
  .refine(
    (body) => Object.keys(body).some((key) => key !== 'expected_version'),
    'Provide at least one field to update.'
  );

export const SORTABLE_NOTE_FIELDS = ['entry_date', 'created_at', 'updated_at', 'title'] as const;

const SORT_COLUMNS: Record<(typeof SORTABLE_NOTE_FIELDS)[number], string> = {
  entry_date: 'entryDate',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  title: 'title',
};

export const listNotesSchema = z
  .object({
    ...listRangeFields,
    ...paginationFields,
    tag: z.string().trim().min(1).max(30).toLowerCase().optional(),
    sort: z.enum(SORTABLE_NOTE_FIELDS).default('entry_date'),
  })
  .strict()
  .refine(orderedDateRange, 'date_from must not be after date_to.');

export type ListNotesQuery = z.infer<typeof listNotesSchema>;

export function sortColumn(sort: ListNotesQuery['sort']): string {
  return SORT_COLUMNS[sort];
}

export function parseListQuery(url: string): ListNotesQuery {
  return parseQuery(listNotesSchema, url);
}
