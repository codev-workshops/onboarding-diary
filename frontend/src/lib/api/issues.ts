import type { ApiTransport, EntryApi, EntryBase, EntryListQuery, Page } from "@/lib/api/core";
import { toQuery } from "@/lib/api/core";

// ---- S4: issue log contract (docs/openapi.yaml `Issue*`) --------------------------

export const ISSUE_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

export const ISSUE_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

/** Allowed status edges (docs/detailed-requirements.md §1.4); the backend enforces them with 422. */
export const ISSUE_TRANSITIONS: Record<IssueStatus, readonly IssueStatus[]> = {
  OPEN: ["IN_PROGRESS", "RESOLVED"],
  IN_PROGRESS: ["RESOLVED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: ["IN_PROGRESS"],
};

/** INV-07: these statuses require non-blank `resolutionNotes` (422 RESOLUTION_NOTES_REQUIRED otherwise). */
export const ISSUE_STATUSES_REQUIRING_NOTES: readonly IssueStatus[] = ["RESOLVED", "CLOSED"];

export interface Issue extends EntryBase {
  title: string;
  description: string | null;
  severity: IssueSeverity;
  status: IssueStatus;
  resolutionNotes: string | null;
  /** Optimistic-lock counter; send it back as `If-Match: "<version>"` on PUT. */
  version: number;
}

/** ETag value for `If-Match` from an issue's `version`. */
export const issueEtag = (issue: Pick<Issue, "version">): string => `"${issue.version}"`;

export interface IssueCreateRequest {
  entryDate: string;
  title: string;
  description?: string | null;
  severity: IssueSeverity;
  status?: IssueStatus;
  resolutionNotes?: string | null;
}

export interface IssueUpdateRequest {
  entryDate: string;
  title: string;
  description?: string | null;
  severity: IssueSeverity;
  status: IssueStatus;
  resolutionNotes?: string | null;
}

export interface ListIssuesQuery extends EntryListQuery {
  status?: IssueStatus;
  severity?: IssueSeverity;
}

/** Typed `/issues` resource; registered once on `ApiClient` as `api.issues`. */
export class IssuesApi implements EntryApi<Issue, IssueCreateRequest, IssueUpdateRequest, ListIssuesQuery> {
  constructor(private readonly http: ApiTransport) {}

  /** operationId: listIssues */
  list(query: ListIssuesQuery = {}): Promise<Page<Issue>> {
    return this.http.request<Page<Issue>>("GET", `/issues${toQuery(query)}`);
  }

  /** operationId: createIssue */
  create(body: IssueCreateRequest): Promise<Issue> {
    return this.http.request<Issue>("POST", "/issues", { body });
  }

  /** operationId: getIssue */
  get(issueId: string): Promise<Issue> {
    return this.http.request<Issue>("GET", `/issues/${issueId}`);
  }

  /** operationId: updateIssue */
  update(issueId: string, body: IssueUpdateRequest, ifMatch?: string): Promise<Issue> {
    return this.http.request<Issue>("PUT", `/issues/${issueId}`, { body, headers: ifMatch ? { "If-Match": ifMatch } : undefined });
  }

  /** operationId: deleteIssue */
  remove(issueId: string): Promise<void> {
    return this.http.request<void>("DELETE", `/issues/${issueId}`);
  }
}
