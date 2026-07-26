/**
 * Query and mutation hooks for the diary resources. Every write invalidates its resource and
 * the dashboard together, because the tiles are derived from these rows (TRD 6.4).
 */

import type { PaginatedEnvelope } from '@onboarding-diary/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import { invalidateEntry } from '../../app/queryClient.js';
import { queryKeys } from '../../app/queryKeys.js';
import type { EntryResource } from '../../app/queryKeys.js';
import { useApiClient } from '../../lib/ApiClientContext.js';
import type { QueryValue } from '../../lib/apiClient.js';
import { ENTRY_PATHS, type EntryDtoOf } from './entryResources.js';

export type EntryQuery = Record<string, QueryValue>;

export function useEntryList<R extends EntryResource>(
  resource: R,
  query: EntryQuery,
): UseQueryResult<PaginatedEnvelope<EntryDtoOf[R]>> {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys[resource].list(query),
    queryFn: () => client.get<PaginatedEnvelope<EntryDtoOf[R]>>(ENTRY_PATHS[resource], { query }),
  });
}

export function useSaveEntry<R extends EntryResource>(
  resource: R,
): UseMutationResult<EntryDtoOf[R], unknown, { id?: string | undefined; body: unknown }> {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, body }: { id?: string | undefined; body: unknown }) => {
      const path = ENTRY_PATHS[resource];
      const response =
        id === undefined
          ? await client.post<{ data: EntryDtoOf[R] }>(path, body)
          : await client.patch<{ data: EntryDtoOf[R] }>(`${path}/${id}`, body);
      return response.data;
    },
    onSuccess: () => invalidateEntry(queryClient, resource),
  });
}

export function useDeleteEntry(resource: EntryResource): UseMutationResult<void, unknown, string> {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => client.del(`${ENTRY_PATHS[resource]}/${id}`),
    onSuccess: () => invalidateEntry(queryClient, resource),
  });
}
