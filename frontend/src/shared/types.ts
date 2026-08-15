export type UserRole = 'NewRecruit' | 'Manager' | 'Admin';

export type TaskCategory = 'Training' | 'Setup' | 'Documentation' | 'Meeting' | 'Development' | 'Other';
export type TaskStatus = 'NotStarted' | 'InProgress' | 'Blocked' | 'Completed';
export type TaskPriority = 'Low' | 'Medium' | 'High';
export type IssueSeverity = 'Low' | 'Medium' | 'High' | 'Critical';
export type IssueStatus = 'Open' | 'InProgress' | 'Resolved' | 'Closed';
export type FeedbackType = 'Positive' | 'Suggestion' | 'Concern';

export const taskCategories: TaskCategory[] = ['Training', 'Setup', 'Documentation', 'Meeting', 'Development', 'Other'];
export const taskStatuses: TaskStatus[] = ['NotStarted', 'InProgress', 'Blocked', 'Completed'];
export const taskPriorities: TaskPriority[] = ['Low', 'Medium', 'High'];
export const issueSeverities: IssueSeverity[] = ['Low', 'Medium', 'High', 'Critical'];
export const issueStatuses: IssueStatus[] = ['Open', 'InProgress', 'Resolved', 'Closed'];
export const feedbackTypes: FeedbackType[] = ['Positive', 'Suggestion', 'Concern'];

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  department?: string | null;
  startDate: string;
  managerId?: number | null;
  managerName?: string | null;
}

export interface AuthResponse {
  token: string;
  expiresAtUtc: string;
  user: User;
}

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface EntryBase {
  id: number;
  userId: number;
  userName: string;
  date: string;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface TaskEntry extends EntryBase {
  title: string;
  description?: string | null;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
}

export interface IssueEntry extends EntryBase {
  title: string;
  description?: string | null;
  severity: IssueSeverity;
  status: IssueStatus;
  resolutionNotes?: string | null;
}

export interface FeedbackEntry extends EntryBase {
  subject: string;
  type: FeedbackType;
  details?: string | null;
}

export interface NoteEntry extends EntryBase {
  title: string;
  content?: string | null;
  tags: string[];
}

export interface DashboardSummary {
  recruitId: number;
  recruitName: string;
  taskCounts: { total: number; notStarted: number; inProgress: number; blocked: number; completed: number };
  taskCompletionPercent: number;
  issueCounts: { total: number; open: number; inProgress: number; resolved: number; closed: number };
  feedbackCounts: { total: number; positive: number; suggestion: number; concern: number };
  notesCount: number;
  recentActivity: { type: string; id: number; title: string; date: string; status?: string | null }[];
}

export interface ApiErrorBody {
  error: { code: string; message: string; details: string[] };
}
