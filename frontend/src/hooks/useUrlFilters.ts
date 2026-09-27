"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface UrlListState<F extends { [K in keyof F]: string }> {
  filters: F;
  page: number;
  sort: string;
}

interface UseUrlFiltersOptions<F extends { [K in keyof F]: string }> {
  defaults: F;
  defaultSort: string;
  /** Rejects unknown values (e.g. enum keys); return `undefined` to fall back to the default. */
  sanitize?: (key: keyof F, raw: string) => string | undefined;
}

/**
 * Two-way sync between the URL query (`?from=&to=&status=&page=&sort=`) and a
 * list's filter/page/sort state. Filter keys ARE the query keys; default values
 * are omitted from the URL so a clean list has a clean URL.
 *
 * `state` is derived from the current URL (deep-linkable, back/forward safe);
 * `set(patch)` writes a new URL (replace, no scroll). Stores subscribe to the
 * returned state via an effect (see /tasks page).
 */
export function useUrlFilters<F extends { [K in keyof F]: string }>({
  defaults,
  defaultSort,
  sanitize,
}: UseUrlFiltersOptions<F>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state = useMemo<UrlListState<F>>(
    () => parseUrlState(searchParams, defaults, defaultSort, sanitize),
    [searchParams, defaults, defaultSort, sanitize],
  );

  const set = useCallback(
    (patch: { filters?: Partial<F>; page?: number; sort?: string }) => {
      const next: UrlListState<F> = {
        filters: { ...state.filters, ...(patch.filters ?? {}) },
        page: patch.page ?? (patch.filters || patch.sort !== undefined ? 0 : state.page),
        sort: patch.sort ?? state.sort,
      };
      const qs = serializeUrlState(next, defaults, defaultSort, searchParams);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, state, defaults, defaultSort, searchParams],
  );

  const reset = useCallback(() => {
    const qs = serializeUrlState(
      { filters: { ...defaults }, page: 0, sort: defaultSort },
      defaults,
      defaultSort,
      searchParams,
    );
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, defaults, defaultSort, searchParams]);

  // Strip invalid values the user typed into the URL so the address bar reflects what is applied.
  useEffect(() => {
    const canonical = serializeUrlState(state, defaults, defaultSort, searchParams);
    if (canonical !== searchParams.toString()) {
      router.replace(canonical ? `${pathname}?${canonical}` : pathname, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return { state, set, reset };
}

export function parseUrlState<F extends { [K in keyof F]: string }>(
  params: URLSearchParams | { get(name: string): string | null },
  defaults: F,
  defaultSort: string,
  sanitize?: (key: keyof F, raw: string) => string | undefined,
): UrlListState<F> {
  const filters = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof F)[]) {
    const raw = params.get(key as string);
    if (raw === null || raw === "") continue;
    const value = sanitize ? sanitize(key, raw) : raw;
    if (value !== undefined) filters[key] = value as F[keyof F];
  }
  const rawPage = Number.parseInt(params.get("page") ?? "", 10);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage - 1 : 0;
  const rawSort = params.get("sort");
  const sort = rawSort && /^[A-Za-z]+,(asc|desc)$/.test(rawSort) ? rawSort : defaultSort;
  return { filters, page, sort };
}

/**
 * Query string (no `?`); default filter values, page 1 and the default sort are
 * omitted. Keys the hook does not manage (e.g. `tab`) are carried over from `base`.
 */
export function serializeUrlState<F extends { [K in keyof F]: string }>(
  state: UrlListState<F>,
  defaults: F,
  defaultSort: string,
  base?: URLSearchParams | { toString(): string },
): string {
  const params = new URLSearchParams(base?.toString() ?? "");
  for (const key of [...Object.keys(defaults), "page", "sort"]) params.delete(key);
  for (const key of Object.keys(defaults) as (keyof F & string)[]) {
    const v = state.filters[key];
    if (v && v !== defaults[key]) params.set(key, v);
  }
  if (state.page > 0) params.set("page", String(state.page + 1));
  if (state.sort && state.sort !== defaultSort) params.set("sort", state.sort);
  return params.toString();
}
