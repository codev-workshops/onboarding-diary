import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './api-client';
import type { PagedResult } from '../types';

export interface ListParams {
  page?: number;
  pageSize?: number;
  recruitId?: number | null;
  from?: string | null;
  to?: string | null;
  search?: string | null;
  [key: string]: string | number | null | undefined;
}

const dateKeys = ['from', 'to'];
const isCompleteDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Drops empty values, and partially typed dates that the API would reject. */
function cleanParams(params: ListParams): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(params).filter(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        return false;
      }
      return !(dateKeys.includes(key) && !isCompleteDate(String(value)));
    }),
  ) as Record<string, string | number>;
}

export function createCrudHooks<TEntry, TPayload>(resource: string) {
  const key = [resource] as const;

  const useList = (params: ListParams) =>
    useQuery({
      queryKey: [...key, params],
      queryFn: async () => {
        const { data } = await apiClient.get<PagedResult<TEntry>>(`/api/${resource}`, {
          params: cleanParams(params),
        });
        return data;
      },
    });

  const useCreate = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (payload: TPayload) => {
        const { data } = await apiClient.post<TEntry>(`/api/${resource}`, payload);
        return data;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
    });
  };

  const useUpdate = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async ({ id, payload }: { id: number; payload: TPayload }) => {
        const { data } = await apiClient.put<TEntry>(`/api/${resource}/${id}`, payload);
        return data;
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
    });
  };

  const useRemove = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (id: number) => {
        await apiClient.delete(`/api/${resource}/${id}`);
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
    });
  };

  return { key, useList, useCreate, useUpdate, useRemove };
}
