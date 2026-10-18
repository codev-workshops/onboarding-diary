import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { Page } from '../api/types';

/** Loads a paginated API resource, re-fetching when the query string changes. */
export function usePaged<T>(path: string, query: URLSearchParams) {
  const [data, setData] = useState<Page<T> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const queryString = query.toString();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await api.get<Page<T>>(queryString ? `${path}?${queryString}` : path));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load data');
    } finally {
      setLoading(false);
    }
  }, [path, queryString]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, error, loading, reload: load };
}
