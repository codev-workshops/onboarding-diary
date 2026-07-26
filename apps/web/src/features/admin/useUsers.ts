import type { PaginatedEnvelope, UpdateUserBody, UserDto } from '@onboarding-diary/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

import { queryKeys } from '../../app/queryKeys.js';
import { useApiClient } from '../../lib/ApiClientContext.js';
import type { QueryValue } from '../../lib/apiClient.js';

export function useUsers(
  query: Record<string, QueryValue>,
): UseQueryResult<PaginatedEnvelope<UserDto>> {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.users.list(query),
    queryFn: () => client.get<PaginatedEnvelope<UserDto>>('/users', { query }),
  });
}

/** Managers available as an assignment target; the picker only offers these (FR-U6). */
export function useManagerOptions(): UseQueryResult<PaginatedEnvelope<UserDto>> {
  const client = useApiClient();
  const query = { role: 'MANAGER', isActive: 'true', pageSize: 100 };
  return useQuery({
    queryKey: queryKeys.users.list(query),
    queryFn: () => client.get<PaginatedEnvelope<UserDto>>('/users', { query }),
  });
}

export function useUpdateUser(): UseMutationResult<
  UserDto,
  unknown,
  { id: string; body: UpdateUserBody }
> {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: UpdateUserBody }) => {
      const response = await client.patch<{ data: UserDto }>(`/users/${id}`, body);
      return response.data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
      ]);
    },
  });
}
