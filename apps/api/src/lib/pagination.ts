/** Pagination helpers shared by every list endpoint (TRD 4.1). */

import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  paginationQuery,
  type PaginationMeta,
} from '@onboarding-diary/shared';

export type PageParams = { page: number; pageSize: number };

/** Clamp arbitrary input to a valid page/pageSize pair. */
export function resolvePageParams(input: unknown): PageParams {
  const parsed = paginationQuery.safeParse(input ?? {});
  if (parsed.success) return parsed.data;
  return { page: 1, pageSize: DEFAULT_PAGE_SIZE };
}

/** Prisma `skip`/`take` for a page. */
export function toPrismaPage({ page, pageSize }: PageParams): { skip: number; take: number } {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function buildMeta(params: PageParams, total: number): PaginationMeta {
  return { page: params.page, pageSize: params.pageSize, total };
}

/** Default ordering for every entry list: newest entry date first (TRD 4.1). */
export const ENTRY_ORDER_BY = [
  { entryDate: 'desc' as const },
  { createdAt: 'desc' as const },
] satisfies { entryDate?: 'asc' | 'desc'; createdAt?: 'asc' | 'desc' }[];

export { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE };
