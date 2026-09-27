import { makeObservable, observable, action, computed, runInAction } from "mobx";
import type { EntryApi, EntryBase, EntryListQuery, Page } from "@/lib/apiClient";

/** Filters every entry list shares; slices extend this with their own enum filters. */
export interface EntryFilters {
  from: string;
  to: string;
}

/**
 * Reference store for recruit-owned diary entries (S3 TaskStore; S4/S5 copy it).
 *
 * - `filters`, `page`, `size`, `sort` describe the list; `query` turns them into
 *   the API query (empty strings are dropped) and pages/screens sync it to the URL.
 * - `recruitId` is set by the manager/admin read-only view; recruits leave it null.
 * - `create` / `update` / `remove` are optimistic: the list page is patched
 *   immediately and the server response (or the next `load`) reconciles it. The
 *   patch is only applied when it keeps the page consistent with the active
 *   filters and sort (see `matchesFilters` / `orderPreserved`); otherwise the
 *   list is dropped and the next screen reloads it. `clear()` (logout)
 *   invalidates in-flight loads and mutations.
 * - `list` is tagged with the query that produced it; `currentList` is `null`
 *   until the loaded page matches `query`, so screens never render results for a
 *   previous filter/page/recruit.
 * - Filter keys are the URL query keys, so `useUrlFilters` can round-trip them.
 *
 * Subclasses pass their `EntryApi`, default filters and default sort; MobX
 * annotations are declared here so subclasses only add their own fields.
 */
export abstract class EntryStore<T extends EntryBase, C, U, F extends EntryFilters, Q extends EntryListQuery> {
  list: Page<T> | null = null;
  /** `JSON.stringify(query)` at the time `list` was loaded. */
  private listKey: string | null = null;
  filters: F;
  page = 0;
  size = 20;
  sort: string;
  recruitId: string | null = null;
  listLoading = false;
  listError: string | null = null;

  current: T | null = null;
  currentLoading = false;
  currentError: string | null = null;

  mutating = false;

  private listSeq = 0;
  private currentSeq = 0;
  private session = 0;

  protected constructor(
    protected readonly api: EntryApi<T, C, U, Q>,
    protected readonly defaultFilters: F,
    protected readonly defaultSort: string,
  ) {
    this.filters = { ...defaultFilters };
    this.sort = defaultSort;
    makeObservable<EntryStore<T, C, U, F, Q>, "applyToList" | "listKey" | "dropList">(this, {
      list: observable,
      listKey: observable,
      filters: observable,
      page: observable,
      size: observable,
      sort: observable,
      recruitId: observable,
      listLoading: observable,
      listError: observable,
      current: observable,
      currentLoading: observable,
      currentError: observable,
      mutating: observable,
      query: computed,
      queryKey: computed,
      currentList: computed,
      hasActiveFilters: computed,
      setFilters: action,
      resetFilters: action,
      setPage: action,
      setSort: action,
      setRecruitId: action,
      load: action,
      loadOne: action,
      create: action,
      update: action,
      remove: action,
      clearCurrent: action,
      clear: action,
      applyToList: action,
      dropList: action,
    });
  }

  /** Slice-specific: map the filter object onto the API query (enum keys etc.). */
  protected abstract filterQuery(filters: F): Omit<Q, keyof EntryListQuery>;

  /** User-facing copy for load errors; slices override to translate their error codes. */
  protected errorMessage(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
  }

  /**
   * Whether an entry belongs in the currently loaded list. The date range is
   * checked here; slices extend it with their enum filters.
   */
  protected matchesFilters(entry: T, filters: F): boolean {
    const from = filters.from.trim();
    const to = filters.to.trim();
    return (!from || entry.entryDate >= from) && (!to || entry.entryDate <= to);
  }

  /**
   * Whether an in-place patch keeps the loaded page ordered. Only the default
   * sort is modelled generically (newest `entryDate` first, ties newest-created
   * first); under any other sort the list is reloaded instead.
   */
  protected orderPreserved(before: T | null, after: T, items: T[]): boolean {
    if (this.sort !== this.defaultSort) return false;
    if (before) return before.entryDate === after.entryDate;
    return items.length === 0 || after.entryDate >= items[0].entryDate;
  }

  // ---- list state ---------------------------------------------------------------

  setFilters(patch: Partial<F>) {
    this.filters = { ...this.filters, ...patch };
    this.page = 0;
  }

  resetFilters() {
    this.filters = { ...this.defaultFilters };
    this.page = 0;
  }

  setPage(page: number) {
    this.page = Math.max(0, page);
  }

  setSort(sort: string) {
    this.sort = sort;
    this.page = 0;
  }

  /** Switch target recruit (manager/admin views); resets list state when it changes. */
  setRecruitId(recruitId: string | null) {
    if (this.recruitId === recruitId) return;
    this.recruitId = recruitId;
    this.list = null;
    this.listError = null;
    this.page = 0;
  }

  get hasActiveFilters(): boolean {
    return (Object.keys(this.defaultFilters) as (keyof F)[]).some((k) => this.filters[k] !== this.defaultFilters[k]);
  }

  get query(): Q {
    return {
      recruitId: this.recruitId ?? undefined,
      from: this.filters.from.trim() || undefined,
      to: this.filters.to.trim() || undefined,
      ...this.filterQuery(this.filters),
      page: this.page,
      size: this.size,
      sort: this.sort,
    } as Q;
  }

  /** Identity of the list the current state asks for; compare with the loaded one. */
  get queryKey(): string {
    return JSON.stringify(this.query);
  }

  /** The loaded page, or `null` when it was produced by a different query than the current state. */
  get currentList(): Page<T> | null {
    return this.list && this.listKey === this.queryKey ? this.list : null;
  }

  async load() {
    const seq = ++this.listSeq;
    const key = this.queryKey;
    const query = this.query;
    this.listLoading = true;
    this.listError = null;
    try {
      const res = await this.api.list(query);
      if (seq !== this.listSeq) return;
      if (res.totalPages > 0 && res.page >= res.totalPages) {
        runInAction(() => (this.page = res.totalPages - 1));
        await this.load();
        return;
      }
      runInAction(() => {
        this.list = res;
        this.listKey = key;
      });
    } catch (e) {
      if (seq !== this.listSeq) return;
      runInAction(() => (this.listError = this.errorMessage(e)));
    } finally {
      if (seq === this.listSeq) runInAction(() => (this.listLoading = false));
    }
  }

  // ---- detail ----------------------------------------------------------------------

  async loadOne(id: string) {
    const seq = ++this.currentSeq;
    if (this.current?.id !== id) this.current = this.list?.items.find((t) => t.id === id) ?? null;
    this.currentLoading = true;
    this.currentError = null;
    try {
      const res = await this.api.get(id);
      if (seq !== this.currentSeq) return;
      runInAction(() => (this.current = res));
    } catch (e) {
      if (seq !== this.currentSeq) return;
      runInAction(() => {
        this.current = null;
        this.currentError = this.errorMessage(e);
      });
    } finally {
      if (seq === this.currentSeq) runInAction(() => (this.currentLoading = false));
    }
  }

  clearCurrent() {
    this.currentSeq++;
    this.current = null;
    this.currentError = null;
    this.currentLoading = false;
  }

  // ---- mutations (optimistic) ----------------------------------------------------------

  /**
   * Creates the entry. It is prepended to the loaded first page only when it
   * matches the active filters and the sort keeps it at the top (see
   * `orderPreserved`); otherwise the list is dropped so the next screen reloads
   * it. Errors propagate.
   */
  async create(body: C): Promise<T> {
    const session = this.session;
    this.mutating = true;
    try {
      const created = await this.api.create(body);
      if (session !== this.session) return created;
      const items = this.currentList?.items ?? [];
      if (
        this.currentList &&
        this.page === 0 &&
        this.matchesFilters(created, this.filters) &&
        this.orderPreserved(null, created, items)
      ) {
        this.applyToList((items) => [created, ...items.filter((t) => t.id !== created.id)].slice(0, this.size), +1);
      } else {
        this.dropList();
      }
      runInAction(() => (this.current = created));
      return created;
    } finally {
      if (session === this.session) runInAction(() => (this.mutating = false));
    }
  }

  /**
   * Replaces the entry with the server response. In the loaded list it is
   * swapped in place while it still matches the filters and keeps its position,
   * removed when it no longer matches, and the list is dropped when its sort
   * position may have changed. `ifMatch` (the ETag the edit was based on) makes
   * the server reject a stale write with 409 CONFLICT. Errors propagate.
   */
  async update(id: string, body: U, ifMatch?: string): Promise<T> {
    const session = this.session;
    this.mutating = true;
    try {
      const updated = await this.api.update(id, body, ifMatch);
      if (session !== this.session) return updated;
      const before = this.currentList?.items.find((t) => t.id === id) ?? null;
      if (!this.currentList || !before) {
        // Not on the loaded page: totals/membership may have changed elsewhere.
        if (this.list) this.dropList();
      } else if (!this.matchesFilters(updated, this.filters)) {
        this.applyToList((items) => items.filter((t) => t.id !== id), -1);
      } else if (this.orderPreserved(before, updated, this.currentList.items)) {
        this.applyToList((items) => items.map((t) => (t.id === id ? updated : t)), 0);
      } else {
        this.dropList();
      }
      runInAction(() => {
        if (this.current?.id === id) this.current = updated;
      });
      return updated;
    } finally {
      if (session === this.session) runInAction(() => (this.mutating = false));
    }
  }

  /**
   * Optimistically drops the entry from the loaded list; if the server rejects
   * the delete the page is restored, but only while the list still belongs to
   * the same query (no load ran since) — a newer query's page is left alone.
   */
  async remove(id: string): Promise<void> {
    const session = this.session;
    const snapshot = this.currentList;
    const snapshotSeq = this.listSeq;
    this.mutating = true;
    if (snapshot) this.applyToList((items) => items.filter((t) => t.id !== id), -1);
    else if (this.list) this.dropList();
    try {
      await this.api.remove(id);
      if (session !== this.session) return;
      runInAction(() => {
        if (this.current?.id === id) this.current = null;
      });
    } catch (e) {
      // Restore only if no other load has run since (same query, same page).
      if (session === this.session && snapshot && this.listSeq === snapshotSeq) {
        runInAction(() => (this.list = snapshot));
      }
      throw e;
    } finally {
      if (session === this.session) runInAction(() => (this.mutating = false));
    }
  }

  private applyToList(transform: (items: T[]) => T[], totalDelta: number) {
    if (!this.list) return;
    const items = transform(this.list.items);
    const totalItems = Math.max(0, this.list.totalItems + totalDelta);
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / this.list.size);
    this.list = { ...this.list, items, totalItems, totalPages };
  }

  /** Forget the loaded page so the next screen reloads it. */
  private dropList() {
    this.list = null;
    this.listKey = null;
  }

  clear() {
    this.listSeq++;
    this.currentSeq++;
    this.session++;
    this.list = null;
    this.listKey = null;
    this.filters = { ...this.defaultFilters };
    this.page = 0;
    this.sort = this.defaultSort;
    this.recruitId = null;
    this.listLoading = false;
    this.listError = null;
    this.current = null;
    this.currentLoading = false;
    this.currentError = null;
    this.mutating = false;
  }
}
