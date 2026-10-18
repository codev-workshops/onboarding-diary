export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: FieldError[];

  constructor(status: number, message: string, fieldErrors: FieldError[] = []) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  fieldMap(): Record<string, string> {
    return Object.fromEntries(this.fieldErrors.map((e) => [e.field, e.message]));
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

let unauthorizedHandler: (() => void) | null = null;

/** Called on any 401 from an authenticated call (e.g. session expired). */
export function onUnauthorized(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.substring(name.length + 1)) : null;
}

async function csrfToken(): Promise<string | null> {
  let token = readCookie('XSRF-TOKEN');
  if (!token) {
    const res = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
    if (res.ok) {
      token = readCookie('XSRF-TOKEN') ?? ((await res.json()) as { token: string }).token;
    }
  }
  return token;
}

async function toApiError(res: Response): Promise<ApiError> {
  try {
    const body = await res.json();
    return new ApiError(res.status, body.message ?? res.statusText, body.fieldErrors ?? []);
  } catch {
    return new ApiError(res.status, res.statusText || 'Request failed');
  }
}

export async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (method !== 'GET') {
    const token = await csrfToken();
    if (token) {
      headers['X-XSRF-TOKEN'] = token;
    }
  }
  const res = await fetch(path, {
    method,
    headers,
    credentials: 'same-origin',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const error = await toApiError(res);
    if (res.status === 401 && !path.startsWith('/api/auth/')) {
      unauthorizedHandler?.();
    }
    throw error;
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: (path: string) => request<void>('DELETE', path),
};

/** Builds a query string, skipping empty values. */
export function query(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}
