const TOKEN_KEY = 'onboarding.token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, string | undefined>;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(`/api${path}`, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, v);
    }
  }
  return url.pathname + url.search;
}

/** Thin fetch wrapper that attaches the JWT and normalizes error handling. */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? (JSON.parse(text) as unknown) : undefined;

  if (!res.ok) {
    const message =
      (data as { error?: { message?: string } } | undefined)?.error?.message ??
      `Request failed (${res.status})`;
    throw new ApiError(res.status, message, data);
  }
  return data as T;
}

/** Downloads a report export (PDF/CSV) as a Blob using the current auth token. */
export async function downloadReport(
  format: 'pdf' | 'csv',
  query: Record<string, string | undefined>,
): Promise<void> {
  const token = getToken();
  const res = await fetch(buildUrl(`/reports/export.${format}`, query), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new ApiError(res.status, `Export failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `onboarding-report.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
