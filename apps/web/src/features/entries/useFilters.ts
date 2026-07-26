/**
 * Filter state lives in the URL so a filtered view is shareable and survives a reload, and
 * so "reset" is a single navigation rather than per-field bookkeeping (FR-T5).
 */

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { DEFAULT_PAGE_SIZE } from '@onboarding-diary/shared';

import type { QueryValue } from '../../lib/apiClient.js';

export type FilterState = {
  /** Current value of a single-valued filter, or `''` when unset. */
  value: (name: string) => string;
  /** Sets or clears one filter; changing a filter always returns to page 1. */
  set: (name: string, value: string) => void;
  reset: () => void;
  page: number;
  setPage: (page: number) => void;
  /** The active filters as API query parameters, including pagination. */
  query: Record<string, QueryValue>;
  activeCount: number;
};

export function useFilters(
  names: readonly string[],
  extra: Record<string, QueryValue> = {},
): FilterState {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = useCallback((name: string) => searchParams.get(name) ?? '', [searchParams]);

  const set = useCallback(
    (name: string, next: string) => {
      setSearchParams((current) => {
        const params = new URLSearchParams(current);
        if (next === '') params.delete(name);
        else params.set(name, next);
        params.delete('page');
        return params;
      });
    },
    [setSearchParams],
  );

  const reset = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  const page = Number.parseInt(searchParams.get('page') ?? '1', 10) || 1;

  const setPage = useCallback(
    (next: number) => {
      setSearchParams((current) => {
        const params = new URLSearchParams(current);
        if (next <= 1) params.delete('page');
        else params.set('page', String(next));
        return params;
      });
    },
    [setSearchParams],
  );

  // `extra` is an inline object at every call site, so it is compared by content.
  const extraKey = JSON.stringify(extra);

  const query = useMemo(() => {
    const fixed = JSON.parse(extraKey) as Record<string, QueryValue>;
    const active: Record<string, QueryValue> = { page, pageSize: DEFAULT_PAGE_SIZE, ...fixed };
    for (const name of names) {
      const current = searchParams.get(name);
      if (current !== null && current !== '') active[name] = current;
    }
    return active;
  }, [extraKey, names, page, searchParams]);

  const activeCount = names.filter((name) => (searchParams.get(name) ?? '') !== '').length;

  return { value, set, reset, page, setPage, query, activeCount };
}
