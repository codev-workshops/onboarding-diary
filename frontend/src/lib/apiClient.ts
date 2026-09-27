import type { ApiTransport, Page, PageQuery, RequestOptions } from "@/lib/api/core";
import { toQuery } from "@/lib/api/core";
import { TasksApi } from "@/lib/api/tasks";
import { IssuesApi } from "@/lib/api/issues";
import { FeedbackApi } from "@/lib/api/feedback";
import { NotesApi } from "@/lib/api/notes";

// Shared envelope/paging/entry types and every per-resource module are re-exported
// so callers keep importing contract types from "@/lib/apiClient".
export type { ApiTransport, EntryApi, EntryBase, EntryListQuery, Page, PageQuery, RequestOptions } from "@/lib/api/core";
export { toQuery } from "@/lib/api/core";
// ---- resource modules (S3+): one `export *` line per slice, appended below ----
export * from "@/lib/api/tasks";
export * from "@/lib/api/issues";
export * from "@/lib/api/feedback";
export * from "@/lib/api/notes";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export const API_PREFIX = "/api/v1";

export type HealthStatus = "UP" | "DOWN";

export interface HealthResponse {
  status: HealthStatus;
}

// ---- contract types (docs/openapi.yaml) -------------------------------------

export type Role = "NEW_RECRUIT" | "MANAGER" | "ADMIN";
export type UserStatus = "INVITED" | "ACTIVE" | "DEACTIVATED";

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  status: UserStatus;
  department: string | null;
  startDate: string | null;
}

export interface UserProfile extends UserSummary {
  invitedAt: string;
  activatedAt: string | null;
  createdBy: UserSummary | null;
  createdAt: string;
  updatedAt: string;
}

// ---- S2: users (admin) & assignments -----------------------------------------

export type AssignmentStatus = "ACTIVE" | "REASSIGNED" | "ENDED";

export interface Assignment {
  id: string;
  recruit: UserSummary;
  manager: UserSummary;
  assignedBy: UserSummary;
  status: AssignmentStatus;
  assignedAt: string;
  endedAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserDetail extends UserProfile {
  currentAssignment: Assignment | null;
  activeRecruitCount: number | null;
}

export interface CreateUserRequest {
  email: string;
  fullName: string;
  role: Role;
  department?: string;
  startDate?: string;
}

/** Absent = unchanged; explicit `null` clears department / startDate. Email only while INVITED. */
export interface AdminUserUpdateRequest {
  fullName?: string;
  department?: string | null;
  startDate?: string | null;
  role?: Role;
  email?: string;
}

export interface ListUsersQuery extends PageQuery {
  role?: Role;
  status?: UserStatus;
  q?: string;
}

export interface ListAssignmentsQuery extends PageQuery {
  recruitId?: string;
  managerId?: string;
  status?: AssignmentStatus;
}

export interface CreateAssignmentRequest {
  recruitId: string;
  managerId: string;
  note?: string;
}

export interface AssignmentResult {
  assignment: Assignment;
  superseded: Assignment | null;
}

export interface MyManagerResponse {
  assignment: Assignment | null;
}

export interface AssignedRecruit {
  recruit: UserSummary;
  assignedAt: string;
  openIssueCount: number;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: UserProfile;
}

export interface SignupRequest {
  email: string;
  password: string;
  fullName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/** Only `fullName` is self-editable; department/startDate are Admin-assigned. */
export interface ProfileUpdateRequest {
  fullName?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** Complete catalog (docs/detailed-requirements.md §5.2); later slices only reference these. */
export type ErrorCode =
  | "VALIDATION_FAILED"
  | "MALFORMED_REQUEST"
  | "INVALID_CURRENT_PASSWORD"
  | "UNAUTHENTICATED"
  | "INVALID_CREDENTIALS"
  | "FORBIDDEN"
  | "NOT_ASSIGNED"
  | "NOT_INVITED"
  | "NOT_FOUND"
  | "EMAIL_ALREADY_EXISTS"
  | "ACCOUNT_ALREADY_ACTIVATED"
  | "ASSIGNMENT_UNCHANGED"
  | "CONFLICT"
  | "INVALID_STATE_TRANSITION"
  | "RESOLUTION_NOTES_REQUIRED"
  | "INVALID_ASSIGNMENT_PARTY"
  | "ROLE_CHANGE_BLOCKED_BY_ASSIGNMENT"
  | "CANNOT_DEACTIVATE_SELF"
  | "EMAIL_LOCKED"
  | "INTERNAL_ERROR"
  | "NETWORK_ERROR";

export interface ErrorDetail {
  field?: string | null;
  code: string;
  message: string;
}

export interface ErrorResponse {
  code: ErrorCode;
  message: string;
  details: ErrorDetail[];
  timestamp: string;
  path: string;
}

/** Form-friendly shape: one message per field plus a form-level message. */
export interface FormErrors {
  form?: string;
  fields: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details: ErrorDetail[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Maps the ErrorResponse envelope onto form errors; field details win over the form message. */
  toFormErrors(): FormErrors {
    const fields: Record<string, string> = {};
    for (const d of this.details) {
      if (d.field && !fields[d.field]) fields[d.field] = d.message;
    }
    return {
      form: Object.keys(fields).length === 0 || this.code !== "VALIDATION_FAILED" ? this.message : undefined,
      fields,
    };
  }
}

export interface AuthHandlers {
  /** Current bearer token, or null when signed out. */
  getToken: () => string | null;
  /** Invoked on every 401 from an authenticated call; AuthStore clears itself and redirects to /login. */
  onUnauthorized: () => void;
}

type FetchLike = typeof fetch;

/**
 * Single typed API client. Components never call `fetch` directly.
 * AuthStore registers itself via `setAuthHandlers` so the client can attach
 * `Authorization: Bearer <token>` and react to 401s.
 */
export class ApiClient implements ApiTransport {
  private authHandlers: AuthHandlers | null = null;

  // ---- entry resources (S3+): one line per slice, appended below --------------
  /** S3 — `/tasks` (see src/lib/api/tasks.ts). */
  readonly tasks = new TasksApi(this);
  /** S4 — `/issues` (see src/lib/api/issues.ts). */
  readonly issues = new IssuesApi(this);
  /** S5 — `/feedback` (see src/lib/api/feedback.ts). */
  readonly feedback = new FeedbackApi(this);
  /** S6 — `/notes` (see src/lib/api/notes.ts). */
  readonly notes = new NotesApi(this);

  constructor(
    private readonly baseUrl: string = API_BASE_URL,
    private readonly fetchImpl: FetchLike = (...args) => fetch(...args),
  ) {}

  setAuthHandlers(handlers: AuthHandlers | null) {
    this.authHandlers = handlers;
  }

  // ---- health --------------------------------------------------------------

  async health(): Promise<HealthResponse> {
    const res = await this.fetchImpl(`${this.baseUrl}/health`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok && res.status !== 503) {
      throw new ApiError(res.status, "INTERNAL_ERROR", `Health check failed with HTTP ${res.status}`);
    }
    return (await res.json()) as HealthResponse;
  }

  // ---- auth (operationIds from docs/openapi.yaml) ----------------------------

  /** operationId: signup — public */
  signup(body: SignupRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>("POST", "/auth/signup", { body, auth: false });
  }

  /** operationId: login — public */
  login(body: LoginRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>("POST", "/auth/login", { body, auth: false });
  }

  /** operationId: logout */
  logout(): Promise<void> {
    return this.request<void>("POST", "/auth/logout");
  }

  // ---- me --------------------------------------------------------------------

  /** operationId: getMyProfile */
  getMyProfile(): Promise<UserProfile> {
    return this.request<UserProfile>("GET", "/me");
  }

  /** operationId: updateMyProfile */
  updateMyProfile(body: ProfileUpdateRequest): Promise<UserProfile> {
    return this.request<UserProfile>("PATCH", "/me", { body });
  }

  /** operationId: changeMyPassword */
  changeMyPassword(body: ChangePasswordRequest): Promise<void> {
    return this.request<void>("POST", "/me/password", { body });
  }

  /** operationId: listMyRecruits — manager */
  listMyRecruits(query: PageQuery = {}): Promise<Page<AssignedRecruit>> {
    return this.request<Page<AssignedRecruit>>("GET", `/me/recruits${toQuery(query)}`);
  }

  /** operationId: getMyManager — recruit */
  getMyManager(): Promise<MyManagerResponse> {
    return this.request<MyManagerResponse>("GET", "/me/manager");
  }

  // ---- users (admin) --------------------------------------------------------

  /** operationId: listUsers */
  listUsers(query: ListUsersQuery = {}): Promise<Page<UserSummary>> {
    return this.request<Page<UserSummary>>("GET", `/users${toQuery(query)}`);
  }

  /** operationId: createUser */
  createUser(body: CreateUserRequest): Promise<UserDetail> {
    return this.request<UserDetail>("POST", "/users", { body });
  }

  /** operationId: getUser */
  getUser(userId: string): Promise<UserDetail> {
    return this.request<UserDetail>("GET", `/users/${encodeURIComponent(userId)}`);
  }

  /** operationId: updateUser */
  updateUser(userId: string, body: AdminUserUpdateRequest): Promise<UserDetail> {
    return this.request<UserDetail>("PATCH", `/users/${encodeURIComponent(userId)}`, { body });
  }

  /** operationId: deactivateUser */
  deactivateUser(userId: string): Promise<UserDetail> {
    return this.request<UserDetail>("POST", `/users/${encodeURIComponent(userId)}/deactivate`);
  }

  /** operationId: reactivateUser */
  reactivateUser(userId: string): Promise<UserDetail> {
    return this.request<UserDetail>("POST", `/users/${encodeURIComponent(userId)}/reactivate`);
  }

  // ---- assignments (admin) ---------------------------------------------------

  /** operationId: listAssignmentHistory — newest first */
  listAssignmentHistory(userId: string, query: PageQuery = {}): Promise<Page<Assignment>> {
    return this.request<Page<Assignment>>("GET", `/users/${encodeURIComponent(userId)}/assignments${toQuery(query)}`);
  }

  /** operationId: listAssignments */
  listAssignments(query: ListAssignmentsQuery = {}): Promise<Page<Assignment>> {
    return this.request<Page<Assignment>>("GET", `/assignments${toQuery(query)}`);
  }

  /** operationId: assignManager — assign or atomically reassign */
  assignManager(body: CreateAssignmentRequest): Promise<AssignmentResult> {
    return this.request<AssignmentResult>("POST", "/assignments", { body });
  }

  // ---- core ------------------------------------------------------------------

  /** Authenticated JSON call used by every method here and by the resource modules. */
  async request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
    const { body, auth = true } = opts;
    const headers: Record<string, string> = { Accept: "application/json", ...opts.headers };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const token = auth ? this.authHandlers?.getToken() ?? null : null;
    if (token) headers.Authorization = `Bearer ${token}`;

    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}${API_PREFIX}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: "no-store",
      });
    } catch (e) {
      throw new ApiError(0, "NETWORK_ERROR", e instanceof Error ? e.message : "Network error");
    }

    if (res.status === 204) return undefined as T;

    if (res.ok) {
      return (await res.json()) as T;
    }

    const error = await this.toApiError(res, path);
    if (res.status === 401 && auth && this.authHandlers?.getToken() === token) {
      this.authHandlers.onUnauthorized();
    }
    throw error;
  }

  private async toApiError(res: Response, path: string): Promise<ApiError> {
    let parsed: Partial<ErrorResponse> | null = null;
    try {
      parsed = (await res.json()) as Partial<ErrorResponse>;
    } catch {
      parsed = null;
    }
    const code: ErrorCode = parsed?.code ?? (res.status === 401 ? "UNAUTHENTICATED" : "INTERNAL_ERROR");
    const message = parsed?.message ?? `Request to ${path} failed with HTTP ${res.status}`;
    return new ApiError(res.status, code, message, parsed?.details ?? []);
  }
}

export const apiClient = new ApiClient();
