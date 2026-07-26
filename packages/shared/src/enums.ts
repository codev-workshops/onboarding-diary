/**
 * Enumerations shared by the API and the web app. Declared once here and mirrored by the
 * Prisma enums; `apps/api/tests/enum-parity.test.ts` asserts the two stay in step.
 */

export const ROLES = ['RECRUIT', 'MANAGER', 'ADMIN'] as const;
export type Role = (typeof ROLES)[number];

export const TASK_CATEGORIES = [
  'SETUP',
  'TRAINING',
  'MEETING',
  'DOCUMENTATION',
  'DEVELOPMENT',
  'OTHER',
] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const TASK_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'DONE'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const ISSUE_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

export const ISSUE_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'WONT_FIX'] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const FEEDBACK_TYPES = ['POSITIVE', 'SUGGESTION', 'CONCERN'] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export const ENTRY_KINDS = ['TASK', 'ISSUE', 'FEEDBACK', 'NOTE'] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

export const DEFAULT_TASK_CATEGORY: TaskCategory = 'OTHER';
export const DEFAULT_TASK_STATUS: TaskStatus = 'NOT_STARTED';
export const DEFAULT_TASK_PRIORITY: TaskPriority = 'MEDIUM';
export const DEFAULT_ISSUE_SEVERITY: IssueSeverity = 'MEDIUM';
export const DEFAULT_ISSUE_STATUS: IssueStatus = 'OPEN';
export const DEFAULT_ROLE: Role = 'RECRUIT';

/** Issue statuses that count as "open" on the dashboard (FR-D3). */
export const OPEN_ISSUE_STATUSES: readonly IssueStatus[] = ['OPEN', 'IN_PROGRESS'];

/** Issue statuses that are expected to carry resolution notes (FR-I7). */
export const CLOSED_ISSUE_STATUSES: readonly IssueStatus[] = ['RESOLVED', 'WONT_FIX'];
