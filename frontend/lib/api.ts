const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://localhost:7030";

export interface HealthResponse {
  status: string;
}

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string;
  startDate: string;
  avatarUrl: string | null;
  managerId: string | null;
  isActive: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  department: string;
  startDate: string;
}

export interface RegisterResponse {
  userId: string;
  email: string;
  name: string;
  role: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ApiError {
  error?: string;
  errors?: { propertyName: string; errorMessage: string }[];
}

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refreshToken");
}

export function setRefreshToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("refreshToken", token);
  } else {
    localStorage.removeItem("refreshToken");
  }
}

export function clearTokens(): void {
  accessToken = null;
  setRefreshToken(null);
}

async function refreshAccessToken(): Promise<string | null> {
  const rt = getRefreshToken();
  if (!rt) return null;

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) {
      clearTokens();
      return null;
    }
    const data: RefreshResponse = await res.json();
    setAccessToken(data.accessToken);
    setRefreshToken(data.refreshToken);
    return data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

interface ApiFetchOptions extends RequestInit {
  suppressRedirect?: boolean;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { suppressRedirect, ...fetchOptions } = options;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let res = await fetch(`${API_BASE_URL}${path}`, { ...fetchOptions, headers });

  if (res.status === 401 && getRefreshToken()) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken();
    }
    const newToken = await refreshPromise;
    refreshPromise = null;

    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE_URL}${path}`, { ...fetchOptions, headers });
    } else {
      if (!suppressRedirect && typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new Error("Session expired. Please log in again.");
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(
      body.error || body.errors?.map((e: { errorMessage: string }) => e.errorMessage).join(", ") || `Request failed (${res.status})`
    );
    (err as Error & { status: number; body: unknown }).status = res.status;
    (err as Error & { body: unknown }).body = body;
    throw err;
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/api/health");
}

export async function register(req: RegisterRequest): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function login(req: LoginRequest): Promise<LoginResponse> {
  const data = await apiFetch<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(req),
  });
  setAccessToken(data.accessToken);
  setRefreshToken(data.refreshToken);
  return data;
}

export async function logout(): Promise<void> {
  const rt = getRefreshToken();
  if (rt) {
    await apiFetch<void>("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken: rt }),
    }).catch(() => {});
  }
  clearTokens();
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, newPassword }),
  });
}

export async function ping(
  opts?: { suppressRedirect?: boolean }
): Promise<{ userId: string; role: string; isAuthenticated: boolean }> {
  return apiFetch("/api/auth/ping", opts);
}

// --- User Profile & Admin User Management ---

export interface UpdateProfileRequest {
  name: string;
  department: string;
  startDate: string;
  avatarUrl: string | null;
}

export interface UpdateRoleRequest {
  role: string;
}

export interface UserListItemDto {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  startDate: string;
  isActive: boolean;
}

export interface PagedUsersResponse {
  users: UserListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function getMyProfile(): Promise<{ user: UserDto }> {
  return apiFetch("/api/users/me");
}

export async function updateMyProfile(req: UpdateProfileRequest): Promise<{ user: UserDto }> {
  return apiFetch("/api/users/me", {
    method: "PUT",
    body: JSON.stringify(req),
  });
}

export async function listUsers(params: {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  department?: string;
}): Promise<PagedUsersResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);
  if (params.role) qs.set("role", params.role);
  if (params.department) qs.set("department", params.department);
  return apiFetch(`/api/users?${qs.toString()}`);
}

export async function updateUserRole(userId: string, role: string): Promise<{ user: UserDto }> {
  return apiFetch(`/api/users/${userId}/role`, {
    method: "PUT",
    body: JSON.stringify({ role }),
  });
}

export async function deactivateUser(userId: string): Promise<void> {
  return apiFetch(`/api/users/${userId}`, {
    method: "DELETE",
  });
}
