export type TaskCategory =
  | 'TRAINING'
  | 'SETUP'
  | 'MEETING'
  | 'DOCUMENTATION'
  | 'SHADOWING'
  | 'PROJECT_WORK'
  | 'ADMIN'
  | 'OTHER';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type IssueSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type FeedbackType = 'POSITIVE' | 'SUGGESTION' | 'CONCERN';

interface Audited {
  id: number;
  entryDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task extends Audited {
  title: string;
  description: string | null;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
}

export interface Issue extends Audited {
  title: string;
  description: string | null;
  severity: IssueSeverity;
  status: IssueStatus;
  resolutionNotes: string | null;
  resolvedAt: string | null;
}

export interface Feedback extends Audited {
  subject: string;
  type: FeedbackType;
  details: string;
}

export interface Note extends Audited {
  title: string;
  content: string;
  tags: string[];
}

export const TASK_CATEGORIES: Record<TaskCategory, string> = {
  TRAINING: 'Training',
  SETUP: 'Setup',
  MEETING: 'Meeting',
  DOCUMENTATION: 'Documentation',
  SHADOWING: 'Shadowing',
  PROJECT_WORK: 'Project work',
  ADMIN: 'Admin',
  OTHER: 'Other',
};

export const TASK_STATUSES: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  BLOCKED: 'Blocked',
  DONE: 'Done',
};

export const TASK_PRIORITIES: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

export const ISSUE_SEVERITIES: Record<IssueSeverity, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const ISSUE_STATUSES: Record<IssueStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

export const FEEDBACK_TYPES: Record<FeedbackType, string> = {
  POSITIVE: 'Positive',
  SUGGESTION: 'Suggestion',
  CONCERN: 'Concern',
};

export function isIssueOpen(status: IssueStatus): boolean {
  return status === 'OPEN' || status === 'IN_PROGRESS';
}

export type EntryType = 'TASK' | 'ISSUE' | 'FEEDBACK' | 'NOTE';

export const ENTRY_TYPES: Record<EntryType, string> = {
  TASK: 'Task',
  ISSUE: 'Issue',
  FEEDBACK: 'Feedback',
  NOTE: 'Note',
};

export const ENTRY_PATHS: Record<EntryType, string> = {
  TASK: 'tasks',
  ISSUE: 'issues',
  FEEDBACK: 'feedback',
  NOTE: 'notes',
};

export interface Dashboard {
  counts: { tasks: number; issues: number; feedback: number; notes: number };
  taskProgress: {
    done: number;
    total: number;
    percent: number | null;
    byStatus: Record<TaskStatus, number>;
  };
  openIssues: {
    count: number;
    bySeverity: Record<IssueSeverity, number>;
    top: { id: number; title: string; severity: IssueSeverity; entryDate: string }[];
  };
  recent: { type: EntryType; id: number; title: string; entryDate: string; createdAt: string }[];
}
