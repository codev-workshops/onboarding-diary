import { PAGINATION } from '@onboarding-diary/shared';
import type { PaginationMeta } from '@onboarding-diary/shared';

export interface PaginationInput {
  page?: number;
  limit?: number;
}

export function parsePagination(input: PaginationInput) {
  const page = Math.max(1, input.page ?? PAGINATION.DEFAULT_PAGE);
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, input.limit ?? PAGINATION.DEFAULT_LIMIT),
  );
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  totalCount: number,
): PaginationMeta {
  const totalPages = Math.ceil(totalCount / limit);
  return {
    page,
    limit,
    total_count: totalCount,
    total_pages: totalPages,
    has_next: page < totalPages,
    has_prev: page > 1,
  };
}
