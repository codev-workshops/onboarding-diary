import { FeedbackType, FeedbackVisibility } from '@prisma/client';
import { z } from 'zod';

import {
  csvEnum,
  entryDateSchema,
  expectedVersionSchema,
  listRangeFields,
  orderedDateRange,
  paginationFields,
  parseQuery,
} from '@/src/modules/entries/schemas';

const subject = z.string().trim().min(3, 'Use a subject of at least 3 characters.').max(140);
const details = z.string().trim().min(10, 'Give at least 10 characters of detail.').max(5000);

/**
 * `visibility` is the author's choice and nobody else's: ADMIN_ONLY hides the
 * entry from the author's manager, which is the point of being able to raise a
 * concern about them. It is settable on create and update by the owner, and the
 * repository predicate — not this schema — is what keeps a manager from reading
 * the result.
 */
export const createFeedbackSchema = z
  .object({
    entry_date: entryDateSchema,
    subject,
    type: z.nativeEnum(FeedbackType),
    details,
    visibility: z.nativeEnum(FeedbackVisibility).default('MANAGER_VISIBLE'),
    owner_id: z.string().uuid().optional(),
  })
  .strict();

export const updateFeedbackSchema = z
  .object({
    entry_date: entryDateSchema,
    subject,
    type: z.nativeEnum(FeedbackType),
    details,
    visibility: z.nativeEnum(FeedbackVisibility),
    expected_version: expectedVersionSchema,
  })
  .partial()
  .strict()
  .refine(
    (body) => Object.keys(body).some((key) => key !== 'expected_version'),
    'Provide at least one field to update.'
  );

export const SORTABLE_FEEDBACK_FIELDS = ['entry_date', 'created_at', 'updated_at', 'type'] as const;

const SORT_COLUMNS: Record<(typeof SORTABLE_FEEDBACK_FIELDS)[number], string> = {
  entry_date: 'entryDate',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  type: 'type',
};

export const listFeedbackSchema = z
  .object({
    ...listRangeFields,
    ...paginationFields,
    type: csvEnum(Object.values(FeedbackType)),
    visibility: csvEnum(Object.values(FeedbackVisibility)),
    sort: z.enum(SORTABLE_FEEDBACK_FIELDS).default('entry_date'),
  })
  .strict()
  .refine(orderedDateRange, 'date_from must not be after date_to.');

export type ListFeedbackQuery = z.infer<typeof listFeedbackSchema>;

export function sortColumn(sort: ListFeedbackQuery['sort']): string {
  return SORT_COLUMNS[sort];
}

export function parseListQuery(url: string): ListFeedbackQuery {
  return parseQuery(listFeedbackSchema, url);
}
