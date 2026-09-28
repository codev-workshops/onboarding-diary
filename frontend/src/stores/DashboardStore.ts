import { action, computed, makeObservable, observable, runInAction } from "mobx";
import type { ApiClient, DashboardSummary, FeedbackType, IssueSeverity, IssueStatus, RecentEntryKind, TaskStatus } from "@/lib/apiClient";
import { ApiError, FEEDBACK_TYPES, ISSUE_SEVERITIES, ISSUE_STATUSES, TASK_STATUSES } from "@/lib/apiClient";

export interface CountRow<K extends string> {
  key: K;
  count: number;
}

export interface RecentEntryView {
  kind: RecentEntryKind;
  id: string;
  title: string;
  entryDate: string;
  createdAt: string;
  href: string;
}

/** Screen-ready projection of `DashboardSummary`; every enum key present, in contract order. */
export interface DashboardView {
  recruitId: string;
  tasks: { total: number; byStatus: CountRow<TaskStatus>[]; completionPercent: number };
  issues: {
    total: number;
    open: number;
    byStatus: CountRow<IssueStatus>[];
    bySeverity: CountRow<IssueSeverity>[];
    recentOpen: DashboardSummary["issues"]["recentOpen"];
  };
  /** `null` when the API omitted the block (caller lacks feedback visibility, D3). */
  feedback: { total: number; byType: CountRow<FeedbackType>[] } | null;
  notes: { total: number };
  recentEntries: RecentEntryView[];
  isEmpty: boolean;
}

const DETAIL_PATH: Record<RecentEntryKind, string> = {
  TASK: "/tasks",
  ISSUE: "/issues",
  FEEDBACK: "/feedback",
  NOTE: "/notes",
};

/** Detail route for a dashboard entry; manager/admin views carry `?recruitId=` like the read-only tabs. */
export function entryHref(kind: RecentEntryKind, id: string, recruitId?: string | null): string {
  const base = `${DETAIL_PATH[kind]}/${id}`;
  return recruitId ? `${base}?recruitId=${encodeURIComponent(recruitId)}` : base;
}

function rows<K extends string>(keys: readonly K[], counts: Partial<Record<K, number>> | undefined): CountRow<K>[] {
  return keys.map((key) => ({ key, count: counts?.[key] ?? 0 }));
}

/** Pure mapping from the API payload to the view; `recruitId` is set for the manager/admin tab. */
export function toDashboardView(summary: DashboardSummary, recruitId?: string | null): DashboardView {
  const completion = Number.isFinite(summary.tasks.completionPercent) ? summary.tasks.completionPercent : 0;
  return {
    recruitId: summary.recruitId,
    tasks: {
      total: summary.tasks.total,
      byStatus: rows(TASK_STATUSES, summary.tasks.byStatus),
      completionPercent: Math.min(100, Math.max(0, Math.round(completion))),
    },
    issues: {
      total: summary.issues.total,
      open: summary.issues.open,
      byStatus: rows(ISSUE_STATUSES, summary.issues.byStatus),
      bySeverity: rows(ISSUE_SEVERITIES, summary.issues.bySeverity),
      recentOpen: summary.issues.recentOpen,
    },
    feedback: summary.feedback ? { total: summary.feedback.total, byType: rows(FEEDBACK_TYPES, summary.feedback.byType) } : null,
    notes: { total: summary.notes.total },
    recentEntries: summary.recentEntries.map((e) => ({ ...e, href: entryHref(e.kind, e.id, recruitId) })),
    isEmpty:
      summary.tasks.total === 0 &&
      summary.issues.total === 0 &&
      (summary.feedback?.total ?? 0) === 0 &&
      summary.notes.total === 0,
  };
}

/** User-facing copy for dashboard failures (REQ-FUNC-070..074). */
export function dashboardErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    switch (e.code) {
      case "NOT_ASSIGNED":
        return "You are not assigned to this recruit, so their dashboard is not available.";
      case "FORBIDDEN":
        return "You are not allowed to view this dashboard.";
      case "NOT_FOUND":
        return "This recruit does not exist.";
      case "NETWORK_ERROR":
        return "Could not reach the server. Check your connection and try again.";
      default:
        return e.status >= 500 ? "The dashboard could not be loaded right now. Please try again." : e.message;
    }
  }
  return e instanceof Error ? e.message : "Something went wrong";
}

/** Retrying cannot fix an authorization or missing-recruit answer. */
function isRetryable(e: unknown): boolean {
  return !(e instanceof ApiError && (e.status === 403 || e.status === 404));
}

/**
 * Dashboard read model (S7). One summary at a time, keyed by the requested
 * `recruitId` (`null` = the signed-in recruit). `view` is `null` until the
 * loaded summary matches the current key, so a tab never shows another
 * recruit's numbers. `clear()` (logout) invalidates in-flight loads.
 */
export class DashboardStore {
  summary: DashboardSummary | null = null;
  /** Key the current `summary` was loaded for. */
  private summaryKey: string | null = null;
  recruitId: string | null = null;
  loading = false;
  error: string | null = null;
  retryable = true;

  private seq = 0;

  constructor(private readonly api: ApiClient) {
    makeObservable<DashboardStore, "summaryKey">(this, {
      summary: observable,
      summaryKey: observable,
      recruitId: observable,
      loading: observable,
      error: observable,
      retryable: observable,
      view: computed,
      load: action,
      clear: action,
    });
  }

  private static key(recruitId: string | null): string {
    return recruitId ?? "self";
  }

  get view(): DashboardView | null {
    if (!this.summary || this.summaryKey !== DashboardStore.key(this.recruitId)) return null;
    return toDashboardView(this.summary, this.recruitId);
  }

  /** Loads the dashboard for `recruitId` (omit for the signed-in recruit). */
  async load(recruitId: string | null = null): Promise<void> {
    const seq = ++this.seq;
    this.recruitId = recruitId;
    this.loading = true;
    this.error = null;
    try {
      const summary = await this.api.dashboard.get(recruitId);
      if (seq !== this.seq) return;
      runInAction(() => {
        this.summary = summary;
        this.summaryKey = DashboardStore.key(recruitId);
        this.loading = false;
      });
    } catch (e) {
      if (seq !== this.seq) return;
      runInAction(() => {
        this.summary = null;
        this.summaryKey = null;
        this.error = dashboardErrorMessage(e);
        this.retryable = isRetryable(e);
        this.loading = false;
      });
    }
  }

  /** Re-runs the last load (error banner "Retry"). */
  retry(): Promise<void> {
    return this.load(this.recruitId);
  }

  clear() {
    this.seq += 1;
    this.summary = null;
    this.summaryKey = null;
    this.recruitId = null;
    this.loading = false;
    this.error = null;
    this.retryable = true;
  }
}
