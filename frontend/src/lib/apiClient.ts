export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export type HealthStatus = "UP" | "DOWN";

export interface HealthResponse {
  status: HealthStatus;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Single typed API client. Components never call `fetch` directly.
 * Token injection and 401 handling are added in S1 (AuthStore).
 */
export class ApiClient {
  constructor(private readonly baseUrl: string = API_BASE_URL) {}

  async health(): Promise<HealthResponse> {
    const res = await fetch(`${this.baseUrl}/health`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok && res.status !== 503) {
      throw new ApiError(res.status, `Health check failed with HTTP ${res.status}`);
    }
    return (await res.json()) as HealthResponse;
  }
}

export const apiClient = new ApiClient();
