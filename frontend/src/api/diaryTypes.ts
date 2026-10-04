export const TASK_CATEGORIES = [
  'TRAINING',
  'SETUP',
  'DOCUMENTATION',
  'MEETING',
  'CODING',
  'SHADOWING',
  'ADMINISTRATIVE',
  'OTHER',
] as const;
export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'] as const;
export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export const ISSUE_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export const ISSUE_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const;
export const FEEDBACK_TYPES = ['POSITIVE', 'SUGGESTION', 'CONCERN'] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];
export type IssueStatus = (typeof ISSUE_STATUSES)[number];
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export type DiaryResource = 'tasks' | 'issues' | 'feedback' | 'notes';

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

interface EntryBase {
  id: number;
  entryDate: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface Task extends EntryBase {
  title: string;
  description: string | null;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  completedAt: string | null;
}

export interface Issue extends EntryBase {
  title: string;
  description: string | null;
  severity: IssueSeverity;
  status: IssueStatus;
  resolutionNotes: string | null;
  resolvedAt: string | null;
  relatedTaskId: number | null;
  relatedTaskTitle: string | null;
}

export interface Feedback extends EntryBase {
  subject: string;
  type: FeedbackType;
  details: string;
}

export interface Note extends EntryBase {
  title: string;
  content: string;
  tags: string[];
  shared: boolean;
}

export interface TaskRequest {
  entryDate: string;
  title: string;
  description?: string;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  version?: number;
}

export interface IssueRequest {
  entryDate: string;
  title: string;
  description?: string;
  severity: IssueSeverity;
  status: IssueStatus;
  resolutionNotes?: string;
  relatedTaskId?: number | null;
  version?: number;
}

export interface FeedbackRequest {
  entryDate: string;
  subject: string;
  type: FeedbackType;
  details: string;
  version?: number;
}

export interface NoteRequest {
  entryDate: string;
  title: string;
  content: string;
  tags: string[];
  shared: boolean;
  version?: number;
}
