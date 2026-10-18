import { useSearchParams } from 'react-router-dom';

/** List filters kept in the URL so they survive reloads and back navigation. */
export function useFilters() {
  const [params, setParams] = useSearchParams();

  function setFilter(name: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) {
      next.set(name, value);
    } else {
      next.delete(name);
    }
    if (name !== 'page') {
      next.delete('page');
    }
    setParams(next, { replace: true });
  }

  function clear() {
    setParams(new URLSearchParams(), { replace: true });
  }

  return { params, get: (name: string) => params.get(name) ?? '', setFilter, clear };
}
