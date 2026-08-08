export type Role = 'recruit' | 'manager' | 'admin';

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  department: string;
  startDate: string;
  managerId: number | null;
}

export interface BaseEntry {
  id: number;
  userId: number;
  userName: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskEntry extends BaseEntry {
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
}

export interface IssueEntry extends BaseEntry {
  title: string;
  description: string;
  severity: string;
  status: string;
  resolutionNotes: string;
}

export interface FeedbackEntry extends BaseEntry {
  subject: string;
  type: string;
  details: string;
}

export interface NoteEntry extends BaseEntry {
  title: string;
  content: string;
  tags: string;
}

export interface DashboardData {
  counts: { tasks: number; issues: number; feedback: number; notes: number };
  tasksByStatus: Record<string, number>;
  issuesBySeverity: Record<string, number>;
  issuesByStatus: Record<string, number>;
  feedbackByType: Record<string, number>;
  completionRate: number;
  openIssues: number;
  recent: {
    tasks: TaskEntry[];
    issues: IssueEntry[];
    feedback: FeedbackEntry[];
    notes: NoteEntry[];
  };
  activity: Array<{ date: string; tasks: number; issues: number }>;
}

export interface SearchResults {
  query: string;
  total: number;
  results: {
    tasks: TaskEntry[];
    issues: IssueEntry[];
    feedback: FeedbackEntry[];
    notes: NoteEntry[];
  };
}

export const TASK_CATEGORIES = [
  'Setup',
  'Training',
  'Documentation',
  'Shadowing',
  'Development',
  'Meeting',
  'Other',
] as const;
export const TASK_STATUSES = ['Not started', 'In progress', 'Completed', 'Blocked'] as const;
export const TASK_PRIORITIES = ['Low', 'Medium', 'High'] as const;
export const ISSUE_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
export const ISSUE_STATUSES = ['Open', 'In progress', 'Resolved'] as const;
export const FEEDBACK_TYPES = ['Positive', 'Suggestion', 'Concern'] as const;
