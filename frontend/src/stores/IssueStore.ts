import type { ApiClient, Issue, IssueCreateRequest, IssueSeverity, IssueStatus, IssueUpdateRequest, ListIssuesQuery } from "@/lib/apiClient";
import { ApiError, ISSUE_SEVERITIES, ISSUE_STATUSES } from "@/lib/apiClient";
import { EntryStore, type EntryFilters } from "@/stores/EntryStore";

export interface IssueFilters extends EntryFilters {
  status: IssueStatus | "";
  severity: IssueSeverity | "";
}

export const DEFAULT_ISSUE_FILTERS: IssueFilters = { from: "", to: "", status: "", severity: "" };
export const DEFAULT_ISSUE_SORT = "entryDate,desc";

export function isIssueSeverity(v: string | null | undefined): v is IssueSeverity {
  return v != null && (ISSUE_SEVERITIES as readonly string[]).includes(v);
}

export function isIssueStatus(v: string | null | undefined): v is IssueStatus {
  return v != null && (ISSUE_STATUSES as readonly string[]).includes(v);
}

/** User-facing copy for the issue error catalog (REQ-FUNC-040..046). */
export function issueErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    switch (e.code) {
      case "INVALID_STATE_TRANSITION":
        return e.details[0]?.message ? `Status ${e.details[0].message}.` : "That status change is not allowed.";
      case "RESOLUTION_NOTES_REQUIRED":
        return "Resolution notes are required to resolve or close an issue.";
      case "NOT_FOUND":
        return "This issue does not exist or you cannot access it.";
      case "CONFLICT":
        return "This issue was changed by someone else. Review the latest version and try again.";
      case "NOT_ASSIGNED":
        return "You are not assigned to this recruit.";
      case "FORBIDDEN":
        return "You are not allowed to do that.";
      case "VALIDATION_FAILED": {
        const fields = e.details.filter((d) => d.field).map((d) => `${d.field} ${d.message}`);
        return fields.length ? `Check the filters: ${fields.join("; ")}.` : e.message;
      }
      default:
        return e.message;
    }
  }
  return e instanceof Error ? e.message : "Something went wrong";
}

/** Issue log (REQ-FUNC-040..046), built on the S3 `EntryStore<T>`. */
export class IssueStore extends EntryStore<Issue, IssueCreateRequest, IssueUpdateRequest, IssueFilters, ListIssuesQuery> {
  constructor(api: ApiClient) {
    super(api.issues, DEFAULT_ISSUE_FILTERS, DEFAULT_ISSUE_SORT);
  }

  protected override errorMessage(e: unknown): string {
    return issueErrorMessage(e);
  }

  protected filterQuery(filters: IssueFilters): Pick<ListIssuesQuery, "status" | "severity"> {
    return {
      status: filters.status || undefined,
      severity: filters.severity || undefined,
    };
  }

  protected override matchesFilters(issue: Issue, filters: IssueFilters): boolean {
    return (
      super.matchesFilters(issue, filters) &&
      (!filters.status || issue.status === filters.status) &&
      (!filters.severity || issue.severity === filters.severity)
    );
  }
}
