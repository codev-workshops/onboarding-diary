import { z } from 'zod';

/**
 * The validation vocabulary every entry kind shares. It lives here rather than
 * being copied per module because these are the rules that keep a query string
 * out of the SQL: a date that is really a date, an enum filter that is really
 * an enum, and a page size with a ceiling.
 */

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

/** `?status=OPEN,CLOSED` — split, then validated member by member. */
export const csvEnum = <T extends string>(values: readonly T[]) =>
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

export const entryTitleSchema = z.string().trim().min(3, 'Use a title of at least 3 characters.').max(140);

/** Shared by every list endpoint; `sort` and `order` are added per kind. */
export const paginationFields = {
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(20),
  order: z.enum(['asc', 'desc']).default('desc'),
};

export const listRangeFields = {
  owner_id: z.string().uuid().optional(),
  date_from: entryDateSchema.optional(),
  date_to: entryDateSchema.optional(),
  q: z.string().trim().min(1).max(140).optional(),
};

export const orderedDateRange = (query: { date_from?: Date; date_to?: Date }): boolean =>
  !query.date_from || !query.date_to || query.date_from <= query.date_to;

/**
 * Optimistic concurrency is opt-in per request: send the `version` you read and
 * a concurrent edit fails with 409 instead of overwriting silently. Omitting it
 * is last-write-wins, which is honest about what the field does rather than
 * implying a guarantee nobody enforces.
 */
export const expectedVersionSchema = z.coerce.number().int().min(1).optional();

export function parseQuery<Schema extends z.ZodTypeAny>(schema: Schema, url: string): z.output<Schema> {
  return schema.parse(Object.fromEntries(new URL(url).searchParams));
}

/** Only string params reach the schema; `?q=` and repeated keys are dropped. */
export function parseSearchParams<Schema extends z.ZodTypeAny>(
  schema: Schema,
  raw: Record<string, string | string[] | undefined>
): z.output<Schema> {
  const entries = Object.entries(raw).filter(
    ([, value]) => typeof value === 'string' && value.length > 0
  ) as [string, string][];

  const parsed = schema.safeParse(Object.fromEntries(entries));
  // A query string that does not parse is a stale or hand-edited link, not an
  // attack worth an error page; fall back to the default view.
  return parsed.success ? parsed.data : schema.parse({});
}
