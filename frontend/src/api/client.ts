const BASE_URL = '/api/v1';

export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  errors?: Record<string, string[]>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetails;

  constructor(status: number, problem: ProblemDetails) {
    super(problem.detail ?? problem.title ?? `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }

  /** Flattened field errors from an RFC 7807 validation problem, keyed by lower-cased field. */
  get fieldErrors(): Record<string, string> {
    return Object.fromEntries(
      Object.entries(this.problem.errors ?? {}).map(([field, messages]) => [
        field.charAt(0).toLowerCase() + field.slice(1),
        messages.join(' '),
      ])
    );
  }
}

let accessToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options;
  const headers: Record<string, string> = {};

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    signal,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401) {
    onUnauthorized?.();
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readProblem(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export interface DownloadedFile {
  blob: Blob;
  fileName: string;
}

/**
 * Fetches a binary response (report downloads) through the same auth and ProblemDetails handling
 * as {@link apiRequest}, returning the blob plus the server's filename.
 */
export async function apiDownload(path: string, fallbackName: string): Promise<DownloadedFile> {
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, { headers });

  if (response.status === 401) {
    onUnauthorized?.();
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readProblem(response));
  }

  return { blob: await response.blob(), fileName: fileNameOf(response) ?? fallbackName };
}

function fileNameOf(response: Response): string | null {
  const disposition = response.headers.get('content-disposition');
  const match = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return match === null || match === undefined ? null : decodeURIComponent(match[1]);
}

async function readProblem(response: Response): Promise<ProblemDetails> {
  try {
    return (await response.json()) as ProblemDetails;
  } catch {
    return { status: response.status, title: response.statusText };
  }
}
