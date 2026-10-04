import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PAGE_SIZE, type ListParams } from '../api/diary';

export type FilterChanges = Record<string, string | string[] | null | undefined>;

/**
 * Keeps list filters and the (1-based) page number in the URL query string so filtered views
 * survive reloads and can be bookmarked. Changing a filter returns to the first page.
 */
export function useUrlFilters() {
  const [params, setParams] = useSearchParams();

  const value = useCallback((key: string) => params.get(key) ?? '', [params]);
  const values = useCallback(
    (key: string) => (params.get(key) ?? '').split(',').filter(Boolean),
    [params],
  );
  const page = Math.max(1, Number(params.get('page')) || 1);

  const update = useCallback(
    (changes: FilterChanges, resetPage = true) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          for (const [key, change] of Object.entries(changes)) {
            const text = Array.isArray(change) ? change.join(',') : (change ?? '');
            if (text) next.set(key, text);
            else next.delete(key);
          }
          if (resetPage) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const setPage = useCallback(
    (nextPage: number) => update({ page: nextPage > 1 ? String(nextPage) : null }, false),
    [update],
  );

  const apiParams = useMemo<ListParams>(() => {
    const result: ListParams = {};
    params.forEach((paramValue, key) => {
      if (key !== 'page') result[key] = paramValue;
    });
    return { ...result, page: page - 1, size: PAGE_SIZE };
  }, [params, page]);

  const hasFilters = [...params.keys()].some((key) => key !== 'page');

  return { value, values, page, update, setPage, apiParams, hasFilters };
}
