import {
  FeedbackType,
  IssueSeverity,
  IssueStatus,
  PriorityLevel,
  TaskCategory,
  TaskStatus,
} from '@prisma/client';
import { z } from 'zod';

import { entryDateSchema } from '@/src/modules/entries/schemas';

/**
 * The report request (§17.3). Everything that bounds the work a request can
 * ask for is validated here — range length, how many users, which sections —
 * so the service starts from an already-safe request and the caps below are
 * the only ones in the codebase.
 */

/** §17.5. A report over a year of ten recruits is a demo; ten years is a job. */
export const MAX_RANGE_DAYS = 366;
export const MAX_REPORT_USERS = 50;
export const MAX_SECTION_ROWS = 10_000;

const DAY_MS = 86_400_000;

export const REPORT_SECTIONS = ['TASKS', 'ISSUES', 'FEEDBACK', 'NOTES'] as const;
export type RequestedSection = (typeof REPORT_SECTIONS)[number] | 'COMBINED';

const enumArray = <T extends string>(values: readonly T[]) =>
  z
    .array(z.enum(values as [T, ...T[]]))
    .nonempty()
    .max(values.length)
    .optional();

export const reportFiltersSchema = z
  .object({
    tasks: z
      .object({
        status: enumArray(Object.values(TaskStatus)),
        category: enumArray(Object.values(TaskCategory)),
        priority: enumArray(Object.values(PriorityLevel)),
      })
      .strict()
      .optional(),
    issues: z
      .object({
        status: enumArray(Object.values(IssueStatus)),
        severity: enumArray(Object.values(IssueSeverity)),
      })
      .strict()
      .optional(),
    feedback: z
      .object({ type: enumArray(Object.values(FeedbackType)) })
      .strict()
      .optional(),
    notes: z
      .object({ tags: z.array(z.string().trim().min(1).max(30)).nonempty().max(10).optional() })
      .strict()
      .optional(),
  })
  .strict();

export const reportRequestSchema = z
  .object({
    scope_type: z.enum(['SELF', 'USER', 'USERS', 'DEPARTMENT', 'ORG']),
    user_ids: z.array(z.string().uuid()).max(MAX_REPORT_USERS).optional(),
    department_id: z.string().uuid().optional(),
    date_from: entryDateSchema,
    date_to: entryDateSchema,
    sections: z.array(z.enum([...REPORT_SECTIONS, 'COMBINED'])).nonempty(),
    filters: reportFiltersSchema.optional(),
    include_summary: z.boolean().default(true),
    include_details: z.boolean().default(true),
    format: z.enum(['JSON', 'CSV', 'PDF']).default('JSON'),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.date_from > value.date_to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date_to'],
        message: 'The end date must not be before the start date.',
      });
    }

    const days = Math.round((value.date_to.getTime() - value.date_from.getTime()) / DAY_MS) + 1;
    if (days > MAX_RANGE_DAYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date_from'],
        message: `A report covers at most ${MAX_RANGE_DAYS} days; this range is ${days}.`,
      });
    }

    if (value.scope_type === 'USER' && value.user_ids?.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['user_ids'],
        message: 'Name exactly one user for a single-user report.',
      });
    }

    if (value.scope_type === 'DEPARTMENT' && !value.department_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['department_id'],
        message: 'Choose a department.',
      });
    }

    if (value.scope_type !== 'USER' && value.scope_type !== 'USERS' && value.user_ids?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['user_ids'],
        message: 'Users can only be named for a single-user or multi-user report.',
      });
    }

    if (!value.include_summary && !value.include_details) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['include_details'],
        message: 'Include a summary, details, or both.',
      });
    }
  });

export type ReportRequestInput = z.output<typeof reportRequestSchema>;
export type ReportFilters = z.output<typeof reportFiltersSchema>;

/**
 * COMBINED means "everything this caller may see" rather than a fixed list, so
 * a manager asking for a combined report gets one without notes instead of a
 * 403 (§17.1). Named sections are never expanded this way: asking for NOTES
 * explicitly is still refused, because that request said something specific.
 */
export function expandSections(
  requested: readonly RequestedSection[],
  canReadNotes: boolean
): (typeof REPORT_SECTIONS)[number][] {
  const chosen = new Set<(typeof REPORT_SECTIONS)[number]>();

  for (const section of requested) {
    if (section !== 'COMBINED') {
      chosen.add(section);
      continue;
    }
    for (const expanded of REPORT_SECTIONS) {
      if (expanded !== 'NOTES' || canReadNotes) chosen.add(expanded);
    }
  }

  return REPORT_SECTIONS.filter((section) => chosen.has(section));
}
