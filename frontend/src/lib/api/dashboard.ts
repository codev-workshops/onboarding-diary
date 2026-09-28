import type { ApiTransport } from "@/lib/api/core";
import { toQuery } from "@/lib/api/core";
import type { TaskStatus } from "@/lib/api/tasks";
import type { Issue, IssueSeverity, IssueStatus } from "@/lib/api/issues";
import type { FeedbackType } from "@/lib/api/feedback";

// ---- S7: dashboard contract (docs/openapi.yaml `DashboardSummary`) -----------------

export const RECENT_ENTRY_KINDS = ["TASK", "ISSUE", "FEEDBACK", "NOTE"] as const;
export type RecentEntryKind = (typeof RECENT_ENTRY_KINDS)[number];

export interface RecentEntry {
  kind: RecentEntryKind;
  id: string;
  entryDate: string;
  title: string;
  createdAt: string;
}

export interface DashboardSummary {
  recruitId: string;
  tasks: {
    total: number;
    /** Keys are TaskStatus values. */
    byStatus: Partial<Record<TaskStatus, number>>;
    completionPercent: number;
  };
  issues: {
    total: number;
    /** OPEN + IN_PROGRESS. */
    open: number;
    byStatus: Partial<Record<IssueStatus, number>>;
    bySeverity: Partial<Record<IssueSeverity, number>>;
    /** Up to 5 newest OPEN/IN_PROGRESS issues. */
    recentOpen: Issue[];
  };
  /** Omitted when the caller lacks feedback visibility (D3). */
  feedback?: {
    total: number;
    byType: Partial<Record<FeedbackType, number>>;
  };
  notes: { total: number };
  /** Up to 10 newest entries across all kinds, `createdAt` desc. */
  recentEntries: RecentEntry[];
}

/** Typed `/dashboard` resource; registered once on `ApiClient` as `api.dashboard`. */
export class DashboardApi {
  constructor(private readonly http: ApiTransport) {}

  /** operationId: getDashboard — `recruitId` omitted for recruits, required for managers/admins. */
  get(recruitId?: string | null): Promise<DashboardSummary> {
    return this.http.request<DashboardSummary>("GET", `/dashboard${toQuery({ recruitId: recruitId ?? undefined })}`);
  }
}
