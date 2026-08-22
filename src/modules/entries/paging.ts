export type Page<T> = {
  items: T[];
  page: { page: number; page_size: number; total: number; total_pages: number };
};

export type PageQuery = { page: number; page_size: number };

export function toPage<Row, Dto>(
  rows: Row[],
  total: number,
  query: PageQuery,
  toDto: (row: Row) => Dto
): Page<Dto> {
  return {
    items: rows.map(toDto),
    page: {
      page: query.page,
      page_size: query.page_size,
      total,
      total_pages: Math.max(1, Math.ceil(total / query.page_size)),
    },
  };
}

/**
 * Ties are broken so that page 2 cannot repeat or skip a row sharing an
 * `entry_date` with the last row of page 1 (API-6). `createdAt` comes first
 * because ids are random UUIDs: without it a day's entries sort arbitrarily and
 * a newly written entry can land anywhere in — or past the end of — its date's
 * group. Newest first within a day is also what the list should show.
 */
export function orderByWithTiebreak(column: string, order: 'asc' | 'desc'): Record<string, 'asc' | 'desc'>[] {
  return column === 'createdAt'
    ? [{ createdAt: order }, { id: 'desc' }]
    : [{ [column]: order }, { createdAt: 'desc' }, { id: 'desc' }];
}

export const skipFor = (query: PageQuery): number => (query.page - 1) * query.page_size;
