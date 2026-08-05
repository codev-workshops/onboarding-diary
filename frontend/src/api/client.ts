const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5171';

export const TOKEN_STORAGE_KEY = 'onboarding-diary.token';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type ProblemDetails = { title?: string; detail?: string; errors?: Record<string, string[]> };

function messageFromProblem(status: number, problem: ProblemDetails | null): string {
  if (problem?.errors) {
    const first = Object.values(problem.errors).flat()[0];
    if (first) return first;
  }
  return problem?.title ?? problem?.detail ?? `Request failed with status ${status}`;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const problem = (await response.json().catch(() => null)) as ProblemDetails | null;
    throw new ApiError(response.status, messageFromProblem(response.status, problem));
  }

  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}
