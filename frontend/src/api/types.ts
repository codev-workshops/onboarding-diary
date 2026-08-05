export type UserRole = 'NewRecruit' | 'Manager' | 'Admin';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  department: string;
  startDate: string;
  managerId: string | null;
  isActive: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface SignupRequest {
  email: string;
  password: string;
  fullName: string;
  department: string;
  startDate: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  fullName: string;
  department: string;
  startDate: string;
}

export const TASK_CATEGORIES = [
  'Training',
  'Setup',
  'Meeting',
  'ProjectWork',
  'Documentation',
  'Other',
] as const;
export const TASK_STATUSES = ['NotStarted', 'InProgress', 'Completed', 'Blocked'] as const;
export const TASK_PRIORITIES = ['Low', 'Medium', 'High'] as const;
export const ISSUE_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
export const ISSUE_STATUSES = ['Open', 'InProgress', 'Resolved', 'Closed'] as const;
export const FEEDBACK_TYPES = ['Positive', 'Suggestion', 'Concern'] as const;

export type TaskCategory = (typeof TASK_CATEGORIES)[number];
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];
export type IssueStatus = (typeof ISSUE_STATUSES)[number];
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export interface TaskRequest {
  date: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
}

export interface TaskResponse extends TaskRequest {
  id: string;
  userId: string;
}

export interface IssueRequest {
  date: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  resolutionNotes: string | null;
}

export interface IssueResponse extends IssueRequest {
  id: string;
  userId: string;
}

export interface FeedbackRequest {
  date: string;
  subject: string;
  type: FeedbackType;
  details: string;
}

export interface FeedbackResponse extends FeedbackRequest {
  id: string;
  userId: string;
}

export interface NoteRequest {
  date: string;
  title: string;
  content: string;
  tags: string[];
}

export interface NoteResponse extends NoteRequest {
  id: string;
  userId: string;
}
