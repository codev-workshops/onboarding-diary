/** Reusable Zod primitives: calendar dates, identifiers, and filter helpers. */

import { z } from 'zod';

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './constants.js';

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** True when `value` is a `YYYY-MM-DD` string naming a real calendar day. */
export function isCalendarDate(value: string): boolean {
  if (!CALENDAR_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** Today in UTC as `YYYY-MM-DD`. */
export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** A plain calendar date with no timezone component (TRD 3.4). */
export const calendarDate = z
  .string()
  .refine(isCalendarDate, 'Must be a valid date in YYYY-MM-DD format');

/** A calendar date that may not be in the future (FR-T9). */
export const pastOrPresentCalendarDate = calendarDate.refine(
  (value) => value <= todayUtc(),
  'Date cannot be in the future',
);

export const uuid = z.string().uuid('Must be a valid identifier');

export const trimmedNonEmptyString = (max: number) =>
  z
    .string()
    .transform((value) => value.trim())
    .pipe(
      z.string().min(1, 'This field is required').max(max, `Must be at most ${max} characters`),
    );

export const optionalText = (max: number) =>
  z
    .string()
    .max(max, `Must be at most ${max} characters`)
    .transform((value) => value.trim())
    .nullish()
    .transform((value) => (value === undefined || value === '' ? null : value));

/**
 * A repeatable enum filter. Accepts a single value, a comma-separated list, or a repeated
 * query parameter, and always yields a de-duplicated array.
 */
export const enumListFilter = <const T extends readonly [string, ...string[]]>(values: T) => {
  const member = z.enum(values);
  return z
    .union([z.string(), z.array(z.string())])
    .transform((value) => (Array.isArray(value) ? value : value.split(',')))
    .transform((parts) => parts.map((part) => part.trim()).filter((part) => part.length > 0))
    .pipe(z.array(member).min(1))
    .transform((parsed) => [...new Set(parsed)]);
};

/** `page` / `pageSize`, clamped to the documented bounds (FR-X4). */
export const paginationQuery = z.object({
  page: z.coerce
    .number()
    .int()
    .catch(1)
    .transform((value) => (value < 1 ? 1 : value))
    .default(1),
  pageSize: z.coerce
    .number()
    .int()
    .catch(DEFAULT_PAGE_SIZE)
    .transform((value) => Math.min(Math.max(value, 1), MAX_PAGE_SIZE))
    .default(DEFAULT_PAGE_SIZE),
});

export type PaginationQuery = z.infer<typeof paginationQuery>;

/** Inclusive `from` / `to` calendar-date range filter. */
export const dateRangeQuery = z
  .object({
    from: calendarDate.optional(),
    to: calendarDate.optional(),
  })
  .refine(
    ({ from, to }) => from === undefined || to === undefined || from <= to,
    'The start date must be on or before the end date',
  );

export const sortOrder = z.enum(['asc', 'desc']).default('desc');
