import { z } from 'zod';
import { PAGINATION } from '../constants';

const searchEntityType = z.enum(['task', 'issue', 'feedback', 'note']);

export const globalSearchParamsSchema = z.object({
  q: z.string().min(1, 'Search query is required').max(200),
  types: z
    .string()
    .transform((val) => val.split(',').map((s) => s.trim()))
    .pipe(z.array(searchEntityType))
    .optional(),
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  limit: z.coerce.number().int().min(1).max(PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT),
  from_date: z.string().date().optional(),
  to_date: z.string().date().optional(),
  sort_by: z.enum(['relevance', 'created_at', 'updated_at']).default('relevance'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export type GlobalSearchParamsSchema = z.infer<typeof globalSearchParamsSchema>;
