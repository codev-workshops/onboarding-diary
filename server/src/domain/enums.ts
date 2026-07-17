/**
 * Enum-like value sets and their semantic meaning.
 *
 * Per docs/ASSUMPTIONS.md §4, these Tier-2 sets are system-defined in v1 (not
 * free-form editable) because the Dashboard and Reports depend on the *meaning*
 * of specific values. Task categories (Tier 1) are admin-managed and live in the
 * database instead. Values are modelled as strings in the schema and validated
 * against these constants.
 */

export const ROLES = ['Recruit', 'Manager', 'Admin'] as const;
export type Role = (typeof ROLES)[number];

export const TASK_STATUSES = ['To Do', 'In Progress', 'Done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

/** The status that marks a task complete — drives Dashboard completion progress. */
export const DONE_TASK_STATUS: TaskStatus = 'Done';

export const TASK_PRIORITIES = ['Low', 'Medium', 'High'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const ISSUE_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

export const ISSUE_STATUSES = ['Open', 'In Progress', 'Resolved'] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

/** Issue statuses considered "open" — drives the Dashboard open-issues count. */
export const OPEN_ISSUE_STATUSES: IssueStatus[] = ['Open', 'In Progress'];

export const FEEDBACK_TYPES = ['Positive', 'Suggestion', 'Concern'] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

/** Default task categories seeded on first boot (Tier 1, admin-editable). */
export const DEFAULT_TASK_CATEGORIES = [
  'Training',
  'Setup',
  'Meeting',
  'Documentation',
  'Other',
] as const;

/** Ordering ranks used for sorting/reporting (docs/ASSUMPTIONS.md §4). */
export const PRIORITY_RANK: Record<TaskPriority, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
};

export const SEVERITY_RANK: Record<IssueSeverity, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
};
