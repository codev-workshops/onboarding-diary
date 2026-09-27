import { makeAutoObservable, runInAction } from "mobx";
import type {
  ApiClient,
  Assignment,
  AssignmentResult,
  AssignmentStatus,
  AssignedRecruit,
  CreateAssignmentRequest,
  ListAssignmentsQuery,
  Page,
  UserSummary,
} from "@/lib/apiClient";
import { ApiError } from "@/lib/apiClient";

export interface AssignmentFilters {
  recruitId: string;
  managerId: string;
  status: AssignmentStatus | "";
}

export const DEFAULT_ASSIGNMENT_FILTERS: AssignmentFilters = { recruitId: "", managerId: "", status: "" };

/** User-facing copy for the assignment error catalog (REQ-FUNC-016..018). */
export function assignmentErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    switch (e.code) {
      case "ASSIGNMENT_UNCHANGED":
        return "This manager is already assigned to the recruit.";
      case "INVALID_ASSIGNMENT_PARTY":
        return e.details[0]?.message
          ? `Invalid assignment: ${e.details[0].message}.`
          : "Invalid assignment: the recruit must be an active new recruit and the manager an active manager.";
      case "CONFLICT":
        return "Another reassignment happened at the same time. Refresh and try again.";
      case "NOT_FOUND":
        return "The selected user no longer exists.";
      case "FORBIDDEN":
        return "Only administrators can assign managers.";
      default:
        return e.message;
    }
  }
  return e instanceof Error ? e.message : "Something went wrong";
}

/**
 * Assignments (REQ-FUNC-016..021): the admin list, the per-recruit history and
 * current assignment shown on the user detail page, the manager's recruits and
 * the recruit's own manager.
 */
export class AssignmentStore {
  assignments: Page<Assignment> | null = null;
  filters: AssignmentFilters = { ...DEFAULT_ASSIGNMENT_FILTERS };
  page = 0;
  size = 20;
  sort = "assignedAt,desc";
  listLoading = false;
  listError: string | null = null;

  /** Recruit whose panel is open on /admin/users/{id}. */
  historyRecruitId: string | null = null;
  history: Page<Assignment> | null = null;
  historyLoading = false;
  historyError: string | null = null;

  /** Active managers offered in the reassign select. */
  managers: UserSummary[] = [];
  managersLoading = false;

  assignSubmitting = false;
  assignError: string | null = null;
  lastResult: AssignmentResult | null = null;

  myRecruits: Page<AssignedRecruit> | null = null;
  myRecruitsLoading = false;
  myRecruitsError: string | null = null;

  myManager: Assignment | null = null;
  myManagerLoaded = false;
  myManagerError: string | null = null;

  private listSeq = 0;
  private historySeq = 0;

  constructor(private readonly api: ApiClient) {
    makeAutoObservable<AssignmentStore, "listSeq" | "historySeq">(this, { listSeq: false, historySeq: false });
  }

  // ---- admin list -------------------------------------------------------------

  setFilters(patch: Partial<AssignmentFilters>) {
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

  get query(): ListAssignmentsQuery {
    return {
      recruitId: this.filters.recruitId.trim() || undefined,
      managerId: this.filters.managerId.trim() || undefined,
      status: this.filters.status || undefined,
      page: this.page,
      size: this.size,
      sort: this.sort,
    };
  }

  async loadAssignments() {
    const seq = ++this.listSeq;
    this.listLoading = true;
    this.listError = null;
    try {
      const res = await this.api.listAssignments(this.query);
      if (seq !== this.listSeq) return;
      runInAction(() => {
        this.assignments = res;
        if (res.totalPages > 0 && res.page >= res.totalPages) this.page = res.totalPages - 1;
      });
    } catch (e) {
      if (seq !== this.listSeq) return;
      runInAction(() => (this.listError = e instanceof Error ? e.message : String(e)));
    } finally {
      if (seq === this.listSeq) runInAction(() => (this.listLoading = false));
    }
  }

  // ---- recruit panel ------------------------------------------------------------

  /** Current ACTIVE assignment of the recruit whose history is loaded, derived from the history page. */
  get currentAssignment(): Assignment | null {
    return this.history?.items.find((a) => a.status === "ACTIVE") ?? null;
  }

  async loadHistory(recruitId: string, page = 0) {
    const seq = ++this.historySeq;
    if (this.historyRecruitId !== recruitId) {
      this.history = null;
      this.assignError = null;
      this.lastResult = null;
    }
    this.historyRecruitId = recruitId;
    this.historyLoading = true;
    this.historyError = null;
    try {
      const res = await this.api.listAssignmentHistory(recruitId, { page, size: this.size });
      if (seq !== this.historySeq) return;
      runInAction(() => (this.history = res));
    } catch (e) {
      if (seq !== this.historySeq) return;
      runInAction(() => (this.historyError = e instanceof Error ? e.message : String(e)));
    } finally {
      if (seq === this.historySeq) runInAction(() => (this.historyLoading = false));
    }
  }

  async loadManagers() {
    this.managersLoading = true;
    try {
      const res = await this.api.listUsers({ role: "MANAGER", status: "ACTIVE", size: 100, sort: "fullName,asc" });
      runInAction(() => (this.managers = res.items));
    } catch {
      runInAction(() => (this.managers = []));
    } finally {
      runInAction(() => (this.managersLoading = false));
    }
  }

  /**
   * Assign or reassign. On success the history is reloaded so the panel shows
   * the new ACTIVE row plus the superseded one. Errors are kept in
   * `assignError` (user-facing copy) and also rethrown for callers that need them.
   */
  async assign(body: CreateAssignmentRequest): Promise<AssignmentResult> {
    this.assignSubmitting = true;
    this.assignError = null;
    this.lastResult = null;
    try {
      const result = await this.api.assignManager(body);
      runInAction(() => (this.lastResult = result));
      if (this.historyRecruitId === body.recruitId) await this.loadHistory(body.recruitId);
      return result;
    } catch (e) {
      runInAction(() => (this.assignError = assignmentErrorMessage(e)));
      throw e;
    } finally {
      runInAction(() => (this.assignSubmitting = false));
    }
  }

  clearAssignFeedback() {
    this.assignError = null;
    this.lastResult = null;
  }

  // ---- me --------------------------------------------------------------------------

  async loadMyRecruits(page = 0, sort = "fullName,asc") {
    this.myRecruitsLoading = true;
    this.myRecruitsError = null;
    try {
      const res = await this.api.listMyRecruits({ page, size: this.size, sort });
      runInAction(() => (this.myRecruits = res));
    } catch (e) {
      runInAction(() => (this.myRecruitsError = e instanceof Error ? e.message : String(e)));
    } finally {
      runInAction(() => (this.myRecruitsLoading = false));
    }
  }

  async loadMyManager() {
    this.myManagerError = null;
    try {
      const res = await this.api.getMyManager();
      runInAction(() => {
        this.myManager = res.assignment;
        this.myManagerLoaded = true;
      });
    } catch (e) {
      runInAction(() => {
        this.myManagerError = e instanceof Error ? e.message : String(e);
        this.myManagerLoaded = true;
      });
    }
  }

  clear() {
    this.assignments = null;
    this.history = null;
    this.historyRecruitId = null;
    this.managers = [];
    this.myRecruits = null;
    this.myManager = null;
    this.myManagerLoaded = false;
    this.assignError = null;
    this.lastResult = null;
  }
}
