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
 * `id` breaks ties so that page 2 cannot repeat or skip a row sharing an
 * `entry_date` with the last row of page 1 (API-6).
 */
export function orderByWithTiebreak(column: string, order: 'asc' | 'desc'): Record<string, 'asc' | 'desc'>[] {
  return [{ [column]: order }, { id: 'desc' }];
}

export const skipFor = (query: PageQuery): number => (query.page - 1) * query.page_size;
