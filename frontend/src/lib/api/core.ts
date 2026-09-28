/**
 * Shared building blocks for per-resource API modules (`src/lib/api/<resource>.ts`).
 * Resource modules import ONLY from this file so they never form a cycle with
 * `apiClient.ts`, which re-exports them and registers each resource once.
 */

/** `{ items, page, size, totalItems, totalPages }` — frozen envelope for every list endpoint. */
export interface Page<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export interface PageQuery {
  page?: number;
  size?: number;
  /** `field,asc|desc`; fields whitelisted per resource by the backend. */
  sort?: string;
}

/** Fields shared by every recruit-owned diary entry (openapi `EntryBase`). */
export interface EntryBase {
  id: string;
  recruitId: string;
  /** ISO date `YYYY-MM-DD`. */
  entryDate: string;
  createdAt: string;
  updatedAt: string;
}

/** Query parameters shared by every entry list endpoint (`RecruitId`, `From`, `To` + paging). */
export interface EntryListQuery extends PageQuery {
  recruitId?: string;
  from?: string;
  to?: string;
}

export interface RequestOptions {
  body?: unknown;
  /** Attach the bearer token (default true). */
  auth?: boolean;
  /** Extra request headers (e.g. `If-Match`). */
  headers?: Record<string, string>;
}

/** A binary (non-JSON) success response, e.g. a generated report. */
export interface DownloadedFile {
  blob: Blob;
  /** From `Content-Disposition: attachment; filename="..."`, or `fallbackFilename`. */
  filename: string;
  contentType: string;
  headers: Headers;
}

/** The single authenticated HTTP entry point that resource modules build on. */
export interface ApiTransport {
  request<T>(method: string, path: string, opts?: RequestOptions): Promise<T>;
  /** Authenticated GET of a binary body (bearer attached); errors still map to `ApiError`. */
  download(path: string, fallbackFilename: string): Promise<DownloadedFile>;
}

/**
 * Contract every entry resource module exposes so `EntryStore<T>` can drive it
 * without knowing the resource. `C` = create body, `U` = update body, `Q` = list query.
 */
export interface EntryApi<T extends EntryBase, C, U, Q extends EntryListQuery> {
  list(query?: Q): Promise<Page<T>>;
  get(id: string): Promise<T>;
  create(body: C): Promise<T>;
  /** `ifMatch` is the ETag of the representation being edited (optimistic lock; stale = 409 CONFLICT). */
  update(id: string, body: U, ifMatch?: string): Promise<T>;
  remove(id: string): Promise<void>;
}

/** Serialises defined, non-empty query values; `?`-prefixed or empty string. */
export function toQuery(query: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query) as [string, string | number | undefined][]) {
    if (value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}
