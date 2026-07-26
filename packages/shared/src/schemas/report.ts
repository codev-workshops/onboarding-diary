import { z } from 'zod';

import { MAX_REPORT_RANGE_DAYS } from '../constants.js';
import { calendarDate, uuid } from '../primitives.js';

export const REPORT_SECTIONS = ['TASKS', 'ISSUES', 'FEEDBACK', 'NOTES'] as const;
export type ReportSection = (typeof REPORT_SECTIONS)[number];

export const REPORT_FORMATS = ['CSV', 'PDF'] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

/** Inclusive day count between two calendar dates. */
export function calendarDaySpan(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  return Math.floor((end - start) / 86_400_000) + 1;
}

export const createReportBody = z
  .object({
    ownerId: uuid.optional(),
    from: calendarDate,
    to: calendarDate,
    sections: z
      .array(z.enum(REPORT_SECTIONS))
      .min(1, 'Select at least one section')
      .transform((sections) => REPORT_SECTIONS.filter((section) => sections.includes(section)))
      .default([...REPORT_SECTIONS]),
    format: z.enum(REPORT_FORMATS),
  })
  .refine(({ from, to }) => from <= to, {
    error: 'The start date must be on or before the end date',
    path: ['from'],
  })
  .refine(({ from, to }) => calendarDaySpan(from, to) <= MAX_REPORT_RANGE_DAYS, {
    error: `The range must not exceed ${MAX_REPORT_RANGE_DAYS} days`,
    path: ['to'],
  });

export type CreateReportBody = z.infer<typeof createReportBody>;

export const REPORT_FILE_EXTENSIONS: Record<ReportFormat, string> = {
  CSV: 'csv',
  PDF: 'pdf',
};

export const REPORT_CONTENT_TYPES: Record<ReportFormat, string> = {
  CSV: 'text/csv; charset=utf-8',
  PDF: 'application/pdf',
};

/** Filename-safe slug of a person's name, e.g. `Nadia Khan` → `nadia-khan`. */
export function slugifyName(fullName: string): string {
  const slug = fullName
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length > 0 ? slug : 'recruit';
}

export function reportFilename(input: {
  fullName: string;
  from: string;
  to: string;
  format: ReportFormat;
}): string {
  const extension = REPORT_FILE_EXTENSIONS[input.format];
  return `onboarding-diary_${slugifyName(input.fullName)}_${input.from}_${input.to}.${extension}`;
}
