import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { Page } from '../api/types';

/**
 * Loads a paginated API resource, re-fetching when the query string changes. Only the most
 * recent request may update state, so a slow response for an older query is discarded.
 */
export function usePaged<T>(path: string, query: URLSearchParams) {
  const [data, setData] = useState<Page<T> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const queryString = query.toString();
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++latestRequest.current;
    const isLatest = () => requestId === latestRequest.current;
    setLoading(true);
    setError('');
    try {
      const page = await api.get<Page<T>>(queryString ? `${path}?${queryString}` : path);
      if (isLatest()) {
        setData(page);
      }
    } catch (err) {
      if (isLatest()) {
        setError(err instanceof Error ? err.message : 'Could not load data');
      }
    } finally {
      if (isLatest()) {
        setLoading(false);
      }
    }
  }, [path, queryString]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, error, loading, reload: load };
}
