import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { deleteEntry, listEntries } from '../api/diary';
import type { DiaryResource } from '../api/diaryTypes';
import { useAuth } from '../auth/useAuth';
import { getErrorMessage } from '../api/errors';
import { useUrlFilters } from './useUrlFilters';

/** List query, editor/delete dialog state and notifications shared by the diary log pages. */
export function useDiaryList<T extends { id: number }>(resource: DiaryResource, noun: string) {
  const filters = useUrlFilters();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: [resource, user?.id, filters.apiParams],
    queryFn: () => listEntries<T>(resource, filters.apiParams),
    placeholderData: keepPreviousData,
  });

  const totalPages = query.data?.totalPages;
  const { page, setPage } = filters;
  useEffect(() => {
    if (totalPages !== undefined && page > Math.max(totalPages, 1)) {
      setPage(Math.max(totalPages, 1));
    }
  }, [totalPages, page, setPage]);

  // undefined = closed, null = creating, T = editing
  const [editing, setEditing] = useState<T | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<T | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: [resource] }),
    [queryClient, resource],
  );

  const onSaved = useCallback(
    (created: boolean) => {
      setEditing(undefined);
      setToast(`${noun} ${created ? 'added' : 'updated'}`);
      void refresh();
    },
    [noun, refresh],
  );

  const confirmDelete = useCallback(async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteEntry(resource, deleting.id);
      setToast(`${noun} deleted`);
      if (query.data?.content.length === 1 && filters.page > 1) {
        filters.setPage(filters.page - 1);
      }
      await refresh();
    } catch (error) {
      setToast(getErrorMessage(error, `Could not delete ${noun.toLowerCase()}`));
    } finally {
      setDeleteBusy(false);
      setDeleting(null);
    }
  }, [deleting, resource, noun, refresh, query.data, filters]);

  return {
    filters,
    data: query.data,
    isLoading: query.isLoading,
    error: query.error ? getErrorMessage(query.error, `Could not load ${resource}`) : null,
    editing,
    openNew: () => setEditing(null),
    openEdit: (item: T) => setEditing(item),
    closeEditor: () => setEditing(undefined),
    onSaved,
    deleting,
    setDeleting,
    deleteBusy,
    confirmDelete,
    toast,
    setToast,
    refresh,
  };
}
