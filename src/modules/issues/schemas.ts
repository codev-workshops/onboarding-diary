import { IssueSeverity, IssueStatus } from '@prisma/client';
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

const description = z.string().trim().min(10, 'Describe the issue in at least 10 characters.').max(5000);

/**
 * The DB refuses a RESOLVED or CLOSED issue without resolution notes of at
 * least 10 characters, so the same rule is enforced here — a constraint
 * violation surfacing as a 500 would be a bug, not validation.
 */
const resolutionNotes = z.string().trim().min(10).max(5000).nullish();

export const CLOSING_STATUSES: readonly IssueStatus[] = ['RESOLVED', 'CLOSED'];

export const createIssueSchema = z
  .object({
    entry_date: entryDateSchema,
    title: entryTitleSchema,
    description,
    severity: z.nativeEnum(IssueSeverity).default('MEDIUM'),
    status: z.nativeEnum(IssueStatus).default('OPEN'),
    resolution_notes: resolutionNotes,
    owner_id: z.string().uuid().optional(),
  })
  .strict()
  .refine(
    (body) => !CLOSING_STATUSES.includes(body.status) || Boolean(body.resolution_notes),
    'Resolution notes are required to resolve or close an issue.'
  );

/**
 * A manager may patch a recruit's issue, but only `status` and
 * `resolution_notes`. That rule is not expressed here — the schema accepts the
 * union and the M3 policy rejects the fields the actor may not write, so there
 * is one place that decides and it is not the schema.
 */
export const updateIssueSchema = z
  .object({
    entry_date: entryDateSchema,
    title: entryTitleSchema,
    description,
    severity: z.nativeEnum(IssueSeverity),
    status: z.nativeEnum(IssueStatus),
    resolution_notes: resolutionNotes,
    expected_version: expectedVersionSchema,
  })
  .partial()
  .strict()
  .refine(
    (body) => Object.keys(body).some((key) => key !== 'expected_version'),
    'Provide at least one field to update.'
  );

export const SORTABLE_ISSUE_FIELDS = [
  'entry_date',
  'created_at',
  'updated_at',
  'severity',
  'status',
] as const;

const SORT_COLUMNS: Record<(typeof SORTABLE_ISSUE_FIELDS)[number], string> = {
  entry_date: 'entryDate',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  severity: 'severity',
  status: 'status',
};

export const listIssuesSchema = z
  .object({
    ...listRangeFields,
    ...paginationFields,
    status: csvEnum(Object.values(IssueStatus)),
    severity: csvEnum(Object.values(IssueSeverity)),
    sort: z.enum(SORTABLE_ISSUE_FIELDS).default('entry_date'),
  })
  .strict()
  .refine(orderedDateRange, 'date_from must not be after date_to.');

export type ListIssuesQuery = z.infer<typeof listIssuesSchema>;

export function sortColumn(sort: ListIssuesQuery['sort']): string {
  return SORT_COLUMNS[sort];
}

export function parseListQuery(url: string): ListIssuesQuery {
  return parseQuery(listIssuesSchema, url);
}
