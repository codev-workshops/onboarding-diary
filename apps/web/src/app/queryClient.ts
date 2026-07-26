import { QueryClient } from '@tanstack/react-query';

import { ApiError } from '../lib/apiClient.js';
import { entryMutationKeys, type EntryResource } from './queryKeys.js';

/** Retrying a 4xx cannot help, so only network and 5xx failures are retried. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  if (error instanceof ApiError) return error.status === 0 || error.status >= 500;
  return false;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
      },
      mutations: { retry: false },
    },
  });
}

export async function invalidateEntry(
  queryClient: QueryClient,
  entry: EntryResource,
): Promise<void> {
  await Promise.all(
    entryMutationKeys(entry).map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}
