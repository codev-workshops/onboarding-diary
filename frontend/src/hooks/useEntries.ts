import { useCallback, useEffect, useState } from 'react';

interface EntryApi<TRequest, TResponse> {
  list: (params?: Record<string, string | undefined>) => Promise<TResponse[]>;
  create: (body: TRequest) => Promise<TResponse>;
  update: (id: string, body: TRequest) => Promise<TResponse>;
  remove: (id: string) => Promise<void>;
}

/// Loads a diary entry list and exposes create/update/delete that keep it in sync.
export function useEntries<TRequest, TResponse extends { id: string }>(
  api: EntryApi<TRequest, TResponse>,
  filters: Record<string, string | undefined> = {},
) {
  const [entries, setEntries] = useState<TResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filterKey = JSON.stringify(filters);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await api.list(JSON.parse(filterKey)));
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to load entries');
    } finally {
      setLoading(false);
    }
  }, [api, filterKey]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(
    async (body: TRequest, id?: string) => {
      if (id) await api.update(id, body);
      else await api.create(body);
      await reload();
    },
    [api, reload],
  );

  const remove = useCallback(
    async (id: string) => {
      await api.remove(id);
      await reload();
    },
    [api, reload],
  );

  return { entries, loading, error, reload, save, remove };
}
