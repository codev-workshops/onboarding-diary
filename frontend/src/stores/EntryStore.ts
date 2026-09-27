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
 *   immediately and the server response (or the next `load`) reconciles it.
 * - Filter keys are the URL query keys, so `useUrlFilters` can round-trip them.
 *
 * Subclasses pass their `EntryApi`, default filters and default sort; MobX
 * annotations are declared here so subclasses only add their own fields.
 */
export abstract class EntryStore<T extends EntryBase, C, U, F extends EntryFilters, Q extends EntryListQuery> {
  list: Page<T> | null = null;
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

  protected constructor(
    protected readonly api: EntryApi<T, C, U, Q>,
    protected readonly defaultFilters: F,
    protected readonly defaultSort: string,
  ) {
    this.filters = { ...defaultFilters };
    this.sort = defaultSort;
    makeObservable<EntryStore<T, C, U, F, Q>, "applyToList">(this, {
      list: observable,
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
    });
  }

  /** Slice-specific: map the filter object onto the API query (enum keys etc.). */
  protected abstract filterQuery(filters: F): Omit<Q, keyof EntryListQuery>;

  /** User-facing copy for load errors; slices override to translate their error codes. */
  protected errorMessage(e: unknown): string {
    return e instanceof Error ? e.message : String(e);
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

  async load() {
    const seq = ++this.listSeq;
    this.listLoading = true;
    this.listError = null;
    try {
      const res = await this.api.list(this.query);
      if (seq !== this.listSeq) return;
      runInAction(() => {
        this.list = res;
        if (res.totalPages > 0 && res.page >= res.totalPages) this.page = res.totalPages - 1;
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

  /** Creates and prepends to the loaded list (new entries sort first by default). Errors propagate. */
  async create(body: C): Promise<T> {
    this.mutating = true;
    try {
      const created = await this.api.create(body);
      this.applyToList((items) => [created, ...items.filter((t) => t.id !== created.id)], +1);
      runInAction(() => (this.current = created));
      return created;
    } finally {
      runInAction(() => (this.mutating = false));
    }
  }

  /** Replaces the entry in the list and in `current` with the server response. Errors propagate. */
  async update(id: string, body: U): Promise<T> {
    this.mutating = true;
    try {
      const updated = await this.api.update(id, body);
      this.applyToList((items) => items.map((t) => (t.id === id ? updated : t)), 0);
      runInAction(() => {
        if (this.current?.id === id) this.current = updated;
      });
      return updated;
    } finally {
      runInAction(() => (this.mutating = false));
    }
  }

  /** Optimistically drops the entry from the list; restores it if the server rejects the delete. */
  async remove(id: string): Promise<void> {
    const snapshot = this.list;
    this.mutating = true;
    this.applyToList((items) => items.filter((t) => t.id !== id), -1);
    try {
      await this.api.remove(id);
      runInAction(() => {
        if (this.current?.id === id) this.current = null;
      });
    } catch (e) {
      runInAction(() => (this.list = snapshot));
      throw e;
    } finally {
      runInAction(() => (this.mutating = false));
    }
  }

  private applyToList(transform: (items: T[]) => T[], totalDelta: number) {
    if (!this.list) return;
    const items = transform(this.list.items);
    const totalItems = Math.max(0, this.list.totalItems + totalDelta);
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / this.list.size);
    this.list = { ...this.list, items, totalItems, totalPages };
  }

  clear() {
    this.listSeq++;
    this.currentSeq++;
    this.list = null;
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
