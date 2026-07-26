/** Shared query fragments for the four entry resources (TRD 4.4). */

export type DateRange = { from?: string | undefined; to?: string | undefined };

export type EntryDateFilter = { gte?: Date; lte?: Date };

/** Inclusive `from`/`to` calendar-date filter, or `undefined` when neither is given. */
export function entryDateFilter(range: DateRange): EntryDateFilter | undefined {
  const filter: EntryDateFilter = {};
  if (range.from !== undefined) filter.gte = new Date(`${range.from}T00:00:00.000Z`);
  if (range.to !== undefined) filter.lte = new Date(`${range.to}T00:00:00.000Z`);
  return filter.gte === undefined && filter.lte === undefined ? undefined : filter;
}

/** Prisma `in` filter for a multi-value enum query parameter. */
export function inFilter<T extends string>(
  values: readonly T[] | undefined,
): { in: T[] } | undefined {
  return values === undefined || values.length === 0 ? undefined : { in: [...values] };
}
