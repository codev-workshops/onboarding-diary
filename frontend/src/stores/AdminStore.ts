import { makeAutoObservable, runInAction } from "mobx";
import type {
  AdminUserUpdateRequest,
  ApiClient,
  CreateUserRequest,
  ListUsersQuery,
  Page,
  Role,
  UserDetail,
  UserStatus,
  UserSummary,
} from "@/lib/apiClient";

export interface UserFilters {
  role: Role | "";
  status: UserStatus | "";
  q: string;
}

export const DEFAULT_USER_FILTERS: UserFilters = { role: "", status: "", q: "" };
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Admin user management (REQ-FUNC-011..015): the paginated list with its
 * filters, and the currently opened user detail. All server data lives here;
 * pages only keep form input state.
 */
export class AdminStore {
  users: Page<UserSummary> | null = null;
  filters: UserFilters = { ...DEFAULT_USER_FILTERS };
  page = 0;
  size = DEFAULT_PAGE_SIZE;
  sort = "fullName,asc";
  listLoading = false;
  listError: string | null = null;

  detail: UserDetail | null = null;
  detailLoading = false;
  detailError: string | null = null;

  private listSeq = 0;
  private detailSeq = 0;

  constructor(private readonly api: ApiClient) {
    makeAutoObservable<AdminStore, "listSeq" | "detailSeq">(this, { listSeq: false, detailSeq: false });
  }

  setFilters(patch: Partial<UserFilters>) {
    this.filters = { ...this.filters, ...patch };
    this.page = 0;
  }

  setPage(page: number) {
    this.page = Math.max(0, page);
  }

  setSort(sort: string) {
    this.sort = sort;
    this.page = 0;
  }

  resetList() {
    this.filters = { ...DEFAULT_USER_FILTERS };
    this.page = 0;
    this.sort = "fullName,asc";
  }

  clear() {
    this.resetList();
    this.users = null;
    this.listError = null;
    this.detail = null;
    this.detailError = null;
  }

  get query(): ListUsersQuery {
    return {
      role: this.filters.role || undefined,
      status: this.filters.status || undefined,
      q: this.filters.q.trim() || undefined,
      page: this.page,
      size: this.size,
      sort: this.sort,
    };
  }

  async loadUsers() {
    const seq = ++this.listSeq;
    this.listLoading = true;
    this.listError = null;
    try {
      const res = await this.api.listUsers(this.query);
      if (seq !== this.listSeq) return;
      runInAction(() => {
        this.users = res;
        // A stale page index (e.g. after filtering) is clamped to the last page.
        if (res.totalPages > 0 && res.page >= res.totalPages) this.page = res.totalPages - 1;
      });
    } catch (e) {
      if (seq !== this.listSeq) return;
      runInAction(() => {
        this.listError = e instanceof Error ? e.message : String(e);
      });
    } finally {
      if (seq === this.listSeq) runInAction(() => (this.listLoading = false));
    }
  }

  async loadUser(userId: string) {
    const seq = ++this.detailSeq;
    if (this.detail?.id !== userId) this.detail = null;
    this.detailLoading = true;
    this.detailError = null;
    try {
      const res = await this.api.getUser(userId);
      if (seq !== this.detailSeq) return;
      runInAction(() => (this.detail = res));
    } catch (e) {
      if (seq !== this.detailSeq) return;
      runInAction(() => {
        this.detailError = e instanceof Error ? e.message : String(e);
      });
    } finally {
      if (seq === this.detailSeq) runInAction(() => (this.detailLoading = false));
    }
  }

  /** Rethrows so the form can map `ApiError` to field errors. */
  async createUser(body: CreateUserRequest): Promise<UserDetail> {
    const created = await this.api.createUser(body);
    runInAction(() => (this.detail = created));
    return created;
  }

  async updateUser(userId: string, body: AdminUserUpdateRequest): Promise<UserDetail> {
    const updated = await this.api.updateUser(userId, body);
    this.applyDetail(updated);
    return updated;
  }

  async deactivateUser(userId: string): Promise<UserDetail> {
    const updated = await this.api.deactivateUser(userId);
    this.applyDetail(updated);
    return updated;
  }

  async reactivateUser(userId: string): Promise<UserDetail> {
    const updated = await this.api.reactivateUser(userId);
    this.applyDetail(updated);
    return updated;
  }

  /** Called by AssignmentStore after an assignment changed the detail's derived fields. */
  applyDetail(updated: UserDetail) {
    runInAction(() => {
      this.detail = updated;
      if (this.users) {
        this.users = {
          ...this.users,
          items: this.users.items.map((u) => (u.id === updated.id ? toSummary(updated) : u)),
        };
      }
    });
  }
}

function toSummary(u: UserDetail): UserSummary {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    status: u.status,
    department: u.department,
    startDate: u.startDate,
  };
}
