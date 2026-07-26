/**
 * Human-readable labels for every enum value, used by the UI and by report renderers so
 * that the two never drift.
 */

import {
  FEEDBACK_TYPES,
  ISSUE_SEVERITIES,
  ISSUE_STATUSES,
  ROLES,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type FeedbackType,
  type IssueSeverity,
  type IssueStatus,
  type Role,
  type TaskCategory,
  type TaskPriority,
  type TaskStatus,
} from './enums.js';

export const ROLE_LABELS: Record<Role, string> = {
  RECRUIT: 'New Recruit',
  MANAGER: 'Manager',
  ADMIN: 'Admin',
};

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  SETUP: 'Setup',
  TRAINING: 'Training',
  MEETING: 'Meeting',
  DOCUMENTATION: 'Documentation',
  DEVELOPMENT: 'Development',
  OTHER: 'Other',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  BLOCKED: 'Blocked',
  DONE: 'Done',
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

export const ISSUE_SEVERITY_LABELS: Record<IssueSeverity, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  WONT_FIX: "Won't Fix",
};

export const FEEDBACK_TYPE_LABELS: Record<FeedbackType, string> = {
  POSITIVE: 'Positive',
  SUGGESTION: 'Suggestion',
  CONCERN: 'Concern',
};

/** Every label map paired with the enum it must cover, for exhaustiveness tests. */
export const LABEL_MAPS = [
  { name: 'Role', values: ROLES, labels: ROLE_LABELS },
  { name: 'TaskCategory', values: TASK_CATEGORIES, labels: TASK_CATEGORY_LABELS },
  { name: 'TaskStatus', values: TASK_STATUSES, labels: TASK_STATUS_LABELS },
  { name: 'TaskPriority', values: TASK_PRIORITIES, labels: TASK_PRIORITY_LABELS },
  { name: 'IssueSeverity', values: ISSUE_SEVERITIES, labels: ISSUE_SEVERITY_LABELS },
  { name: 'IssueStatus', values: ISSUE_STATUSES, labels: ISSUE_STATUS_LABELS },
  { name: 'FeedbackType', values: FEEDBACK_TYPES, labels: FEEDBACK_TYPE_LABELS },
] as const satisfies readonly {
  name: string;
  values: readonly string[];
  labels: Record<string, string>;
}[];
