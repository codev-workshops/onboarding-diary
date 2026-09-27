import type { Issue, IssueSeverity, IssueStatus } from "@/lib/apiClient";
import { ISSUE_SEVERITIES, ISSUE_STATUSES } from "@/lib/apiClient";
import type { SelectOption } from "@/components/entries/FilterBar";
import { formatDateOnly } from "@/components/ui/labels";
import styles from "@/components/entries/entries.module.css";

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const ISSUE_SEVERITY_LABELS: Record<IssueSeverity, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const ISSUE_STATUS_OPTIONS: SelectOption[] = ISSUE_STATUSES.map((s) => ({ value: s, label: ISSUE_STATUS_LABELS[s] }));
export const ISSUE_SEVERITY_OPTIONS: SelectOption[] = ISSUE_SEVERITIES.map((s) => ({ value: s, label: ISSUE_SEVERITY_LABELS[s] }));

const STATUS_CLASS: Record<IssueStatus, string> = {
  OPEN: styles.tagBlocked,
  IN_PROGRESS: styles.tagInProgress,
  RESOLVED: styles.tagDone,
  CLOSED: styles.tagTodo,
};

export function IssueStatusTag({ status }: { status: IssueStatus }) {
  return (
    <span className={`${styles.tag} ${STATUS_CLASS[status]}`} data-testid={`issue-status-${status}`}>
      {ISSUE_STATUS_LABELS[status]}
    </span>
  );
}

export function IssueSeverityTag({ severity }: { severity: IssueSeverity }) {
  const cls = severity === "HIGH" || severity === "CRITICAL" ? styles.tagHigh : severity === "LOW" ? styles.tagLow : "";
  return (
    <span className={`${styles.tag} ${cls}`} data-testid={`issue-severity-${severity}`}>
      {ISSUE_SEVERITY_LABELS[severity]} severity
    </span>
  );
}

/** Card body used by the /issues list and the recruit Issues tab. */
export function IssueCard({ issue }: { issue: Issue }) {
  return (
    <>
      <div className={styles.itemHead}>
        <span className={styles.itemTitle}>{issue.title}</span>
        <span className={styles.itemMeta} style={{ marginTop: 0 }}>
          {formatDateOnly(issue.entryDate)}
        </span>
      </div>
      <div className={styles.itemMeta}>
        <IssueStatusTag status={issue.status} />
        <IssueSeverityTag severity={issue.severity} />
      </div>
      {issue.description && <p className={styles.itemBody}>{issue.description}</p>}
    </>
  );
}
