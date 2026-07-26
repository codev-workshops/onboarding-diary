/**
 * The single API client (TRD 6.4). It attaches the in-memory access token, normalises the
 * error envelope into `ApiError`, and performs exactly one silent refresh per 401 before
 * giving up and reporting an expired session.
 */

import type { ErrorCode, FieldError } from '@onboarding-diary/shared';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode | 'NETWORK_ERROR';
  readonly details: FieldError[];
  readonly requestId: string | null;

  constructor(init: {
    status: number;
    code: ErrorCode | 'NETWORK_ERROR';
    message: string;
    details?: FieldError[];
    requestId?: string | null;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.details = init.details ?? [];
    this.requestId = init.requestId ?? null;
  }

  /** 422 field errors keyed by field name, ready for React Hook Form (FR-X6). */
  get fieldErrors(): Record<string, string> {
    return Object.fromEntries(this.details.map((detail) => [detail.field, detail.message]));
  }
}

export type QueryValue = string | number | boolean | readonly string[] | undefined | null;

export type RequestOptions = {
  query?: Record<string, QueryValue>;
  body?: unknown;
  signal?: AbortSignal;
  /** Set internally to stop a refreshed request from refreshing again. */
  retryOnUnauthenticated?: boolean;
};

export type TokenStore = {
  get(): string | null;
  set(token: string | null): void;
};

export function createMemoryTokenStore(initial: string | null = null): TokenStore {
  let token = initial;
  return {
    get: () => token,
    set: (next) => {
      token = next;
    },
  };
}

export type ApiClientOptions = {
  baseUrl: string;
  tokens: TokenStore;
  /** Called once a 401 survives the silent refresh, so the app can send the user to login. */
  onSessionExpired?: () => void;
  fetchFn?: typeof fetch;
};

export type ApiClient = {
  request: <T>(method: string, path: string, options?: RequestOptions) => Promise<T>;
  get: <T>(path: string, options?: RequestOptions) => Promise<T>;
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => Promise<T>;
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => Promise<T>;
  del: (path: string, options?: RequestOptions) => Promise<void>;
  refresh: () => Promise<boolean>;
  setAccessToken: (token: string | null) => void;
};

function buildQuery(query: Record<string, QueryValue> | undefined): string {
  if (query === undefined) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
      continue;
    }
    params.append(key, String(value));
  }
  const serialised = params.toString();
  return serialised.length > 0 ? `?${serialised}` : '';
}

type ErrorBody = {
  error?: { code?: ErrorCode; message?: string; details?: FieldError[]; requestId?: string };
};

async function toApiError(response: Response): Promise<ApiError> {
  const requestId = response.headers.get('x-request-id');
  let body: ErrorBody = {};
  try {
    body = (await response.json()) as ErrorBody;
  } catch {
    // A non-JSON error body (proxy, gateway) still maps onto the envelope shape.
  }
  return new ApiError({
    status: response.status,
    code: body.error?.code ?? 'INTERNAL_ERROR',
    message: body.error?.message ?? response.statusText ?? 'Request failed',
    ...(body.error?.details === undefined ? {} : { details: body.error.details }),
    requestId: body.error?.requestId ?? requestId,
  });
}

export function createApiClient({
  baseUrl,
  tokens,
  onSessionExpired,
  fetchFn = globalThis.fetch.bind(globalThis),
}: ApiClientOptions): ApiClient {
  async function send(method: string, path: string, options: RequestOptions): Promise<Response> {
    const token = tokens.get();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token !== null) headers['Authorization'] = `Bearer ${token}`;
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';

    try {
      return await fetchFn(`${baseUrl}${path}${buildQuery(options.query)}`, {
        method,
        headers,
        credentials: 'include',
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
        ...(options.signal === undefined ? {} : { signal: options.signal }),
      });
    } catch (error) {
      throw new ApiError({
        status: 0,
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'The network request failed',
      });
    }
  }

  /**
   * Concurrent callers share one refresh. Rotation makes the presented token single-use and
   * the server treats a replay as theft by revoking the token family, so two parallel
   * refreshes (a re-mounted provider, or two requests racing a 401) would log the user out.
   */
  let inFlightRefresh: Promise<boolean> | null = null;

  async function sendRefresh(): Promise<boolean> {
    const response = await send('POST', '/auth/refresh', { retryOnUnauthenticated: false });
    if (!response.ok) {
      tokens.set(null);
      return false;
    }
    const body = (await response.json()) as { data?: { accessToken?: string } };
    const accessToken = body.data?.accessToken;
    if (accessToken === undefined) {
      tokens.set(null);
      return false;
    }
    tokens.set(accessToken);
    return true;
  }

  async function refresh(): Promise<boolean> {
    inFlightRefresh ??= sendRefresh().finally(() => {
      inFlightRefresh = null;
    });
    return inFlightRefresh;
  }

  async function request<T>(
    method: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const response = await send(method, path, options);

    if (response.status === 401 && options.retryOnUnauthenticated !== false) {
      const refreshed = await refresh();
      if (!refreshed) {
        onSessionExpired?.();
        throw await toApiError(response);
      }
      return request<T>(method, path, { ...options, retryOnUnauthenticated: false });
    }

    if (!response.ok) throw await toApiError(response);
    if (response.status === 204) return undefined as T;

    const body = (await response.json()) as T;
    return body;
  }

  return {
    request,
    get: (path, options) => request('GET', path, options),
    post: (path, body, options) => request('POST', path, { ...options, body }),
    patch: (path, body, options) => request('PATCH', path, { ...options, body }),
    del: async (path, options) => {
      await request<void>('DELETE', path, options);
    },
    refresh,
    setAccessToken: tokens.set,
  };
}
