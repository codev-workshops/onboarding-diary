export type Role = "ADMIN" | "MANAGER" | "RECRUIT";
export type UserStatus = "ACTIVE" | "INVITED" | "DISABLED";

export interface UserResponse {
  id: number;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  department: string | null;
  joinDate: string | null;
  managerId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  token: string;
  expiresIn: number;
  user: UserResponse;
}

export interface ApiError {
  status: number;
  message: string;
  fieldErrors?: { field: string; message: string }[];
}

export type TaskCategory =
  | "LEARNING"
  | "SETUP"
  | "MEETING"
  | "DOCUMENTATION"
  | "NETWORKING"
  | "OTHER";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export interface TaskResponse {
  id: number;
  ownerId: number;
  date: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  updatedAt: string;
}

export interface TaskInput {
  date: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
}

export interface TaskFilters {
  status?: TaskStatus;
  category?: TaskCategory;
  priority?: TaskPriority;
  ownerId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export const TASK_CATEGORIES: TaskCategory[] = [
  "LEARNING",
  "SETUP",
  "MEETING",
  "DOCUMENTATION",
  "NETWORKING",
  "OTHER",
];
export const TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
export const TASK_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];

export type IssueSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IssueStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export interface IssueResponse {
  id: number;
  ownerId: number;
  date: string;
  title: string;
  description: string | null;
  severity: IssueSeverity;
  status: IssueStatus;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IssueInput {
  date: string;
  title: string;
  description: string | null;
  severity: IssueSeverity;
  status: IssueStatus;
  resolutionNotes: string | null;
}

export interface IssueFilters {
  status?: IssueStatus;
  severity?: IssueSeverity;
  ownerId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export const ISSUE_SEVERITIES: IssueSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
export const ISSUE_STATUSES: IssueStatus[] = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export type FeedbackType = "POSITIVE" | "SUGGESTION" | "CONCERN";

export interface FeedbackResponse {
  id: number;
  ownerId: number;
  date: string;
  subject: string;
  type: FeedbackType;
  details: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackInput {
  date: string;
  subject: string;
  type: FeedbackType;
  details: string | null;
}

export interface FeedbackFilters {
  type?: FeedbackType;
  ownerId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export const FEEDBACK_TYPES: FeedbackType[] = ["POSITIVE", "SUGGESTION", "CONCERN"];

export interface NoteResponse {
  id: number;
  ownerId: number;
  date: string;
  title: string;
  content: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NoteInput {
  date: string;
  title: string;
  content: string | null;
  tags: string[];
}

export interface NoteFilters {
  tags?: string[];
  ownerId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export type ActivityType = "TASK" | "ISSUE" | "FEEDBACK" | "NOTE";

export interface DashboardResponse {
  summary: {
    tasks: number;
    issues: number;
    feedback: number;
    notes: number;
  };
  taskMetrics: {
    total: number;
    completed: number;
    completionRate: number;
    byStatus: Record<string, number>;
  };
  issueMetrics: {
    total: number;
    open: number;
    byStatus: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  type: ActivityType;
  id: number;
  ownerId: number;
  title: string;
  date: string;
  occurredAt: string;
}
