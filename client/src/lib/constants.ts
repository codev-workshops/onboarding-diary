// Mirrors the server's Tier-2 enum value sets (docs/ASSUMPTIONS.md §4) for use in
// form controls. The server remains the source of truth and validates all input.

export const ROLES = ['Recruit', 'Manager', 'Admin'] as const;
export const TASK_STATUSES = ['To Do', 'In Progress', 'Done'] as const;
export const TASK_PRIORITIES = ['Low', 'Medium', 'High'] as const;
export const ISSUE_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
export const ISSUE_STATUSES = ['Open', 'In Progress', 'Resolved'] as const;
export const FEEDBACK_TYPES = ['Positive', 'Suggestion', 'Concern'] as const;

export type Role = (typeof ROLES)[number];
