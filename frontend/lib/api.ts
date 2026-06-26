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

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  let res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 && getRefreshToken()) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken();
    }
    const newToken = await refreshPromise;
    refreshPromise = null;

    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    } else {
      if (typeof window !== "undefined") {
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

export async function ping(): Promise<{ userId: string; role: string; isAuthenticated: boolean }> {
  return apiFetch("/api/auth/ping");
}

// --- Task Log types ---

export interface TaskDto {
  id: string;
  userId: string;
  date: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  priority: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  date: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  priority: string;
}

export interface UpdateTaskRequest {
  date: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  priority: string;
}

export interface TaskListParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  category?: string;
  status?: string;
  priority?: string;
  recruitId?: string;
}

export interface TaskListResponse {
  tasks: TaskDto[];
  total: number;
  page: number;
  totalPages: number;
}

export interface TaskStatsDto {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  completionRate: number;
}

// --- Task Log API ---

export async function listTasks(params: TaskListParams = {}): Promise<TaskListResponse> {
  const qs = new URLSearchParams();
  if (params.page != null) qs.set("page", String(params.page));
  if (params.limit != null) qs.set("limit", String(params.limit));
  if (params.startDate) qs.set("startDate", params.startDate);
  if (params.endDate) qs.set("endDate", params.endDate);
  if (params.category) qs.set("category", params.category);
  if (params.status) qs.set("status", params.status);
  if (params.priority) qs.set("priority", params.priority);
  if (params.recruitId) qs.set("recruitId", params.recruitId);
  const query = qs.toString();
  return apiFetch<TaskListResponse>(`/api/tasks${query ? `?${query}` : ""}`);
}

export async function getTask(id: string): Promise<{ task: TaskDto }> {
  return apiFetch<{ task: TaskDto }>(`/api/tasks/${id}`);
}

export async function createTask(req: CreateTaskRequest): Promise<{ task: TaskDto }> {
  return apiFetch<{ task: TaskDto }>("/api/tasks", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function updateTask(id: string, req: UpdateTaskRequest): Promise<{ task: TaskDto }> {
  return apiFetch<{ task: TaskDto }>(`/api/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(req),
  });
}

export async function deleteTask(id: string): Promise<void> {
  return apiFetch<void>(`/api/tasks/${id}`, { method: "DELETE" });
}

export async function getTaskStats(recruitId?: string): Promise<TaskStatsDto> {
  const qs = recruitId ? `?recruitId=${recruitId}` : "";
  return apiFetch<TaskStatsDto>(`/api/tasks/stats${qs}`);
}

// --- Issue Log types ---

export interface IssueDto {
  id: string;
  userId: string;
  date: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  isEscalated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIssueRequest {
  date: string;
  title: string;
  description: string;
  severity: string;
  status?: string;
  resolutionNotes?: string | null;
}

export interface UpdateIssueRequest {
  title: string;
  description: string;
  severity: string;
  status: string;
  resolutionNotes: string | null;
}

export interface EscalateIssueRequest {
  message: string;
}

export interface IssueListParams {
  page?: number;
  limit?: number;
  status?: string;
  severity?: string;
  startDate?: string;
  endDate?: string;
  recruitId?: string;
}

export interface IssueListResponse {
  issues: IssueDto[];
  total: number;
  page: number;
  totalPages: number;
}

// --- Issue Log API ---

export async function listIssues(params: IssueListParams = {}): Promise<IssueListResponse> {
  const qs = new URLSearchParams();
  if (params.page != null) qs.set("page", String(params.page));
  if (params.limit != null) qs.set("limit", String(params.limit));
  if (params.status) qs.set("status", params.status);
  if (params.severity) qs.set("severity", params.severity);
  if (params.startDate) qs.set("startDate", params.startDate);
  if (params.endDate) qs.set("endDate", params.endDate);
  if (params.recruitId) qs.set("recruitId", params.recruitId);
  const query = qs.toString();
  return apiFetch<IssueListResponse>(`/api/issues${query ? `?${query}` : ""}`);
}

export async function getIssue(id: string): Promise<{ issue: IssueDto }> {
  return apiFetch<{ issue: IssueDto }>(`/api/issues/${id}`);
}

export async function createIssue(req: CreateIssueRequest): Promise<{ issue: IssueDto }> {
  return apiFetch<{ issue: IssueDto }>("/api/issues", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function updateIssue(id: string, req: UpdateIssueRequest): Promise<{ issue: IssueDto }> {
  return apiFetch<{ issue: IssueDto }>(`/api/issues/${id}`, {
    method: "PUT",
    body: JSON.stringify(req),
  });
}

export async function deleteIssue(id: string): Promise<void> {
  return apiFetch<void>(`/api/issues/${id}`, { method: "DELETE" });
}

export async function escalateIssue(id: string, req: EscalateIssueRequest): Promise<{ issue: IssueDto }> {
  return apiFetch<{ issue: IssueDto }>(`/api/issues/${id}/escalate`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}
