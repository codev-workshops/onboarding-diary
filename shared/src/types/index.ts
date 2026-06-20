export enum UserRole {
  RECRUIT = 'RECRUIT',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
}

export enum TaskCategory {
  LEARNING = 'LEARNING',
  SETUP = 'SETUP',
  MEETING = 'MEETING',
  PROJECT = 'PROJECT',
  OTHER = 'OTHER',
}

export enum TaskStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  BLOCKED = 'BLOCKED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum IssueSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum IssueStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum FeedbackType {
  POSITIVE = 'POSITIVE',
  SUGGESTION = 'SUGGESTION',
  CONCERN = 'CONCERN',
}

export enum ReportType {
  TASKS = 'tasks',
  ISSUES = 'issues',
  FEEDBACK = 'feedback',
  COMBINED = 'combined',
}

export enum ReportFormat {
  PDF = 'pdf',
  CSV = 'csv',
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  department: string;
  startDate: string;
  managerId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskEntry {
  id: string;
  userId: string;
  date: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  updatedAt: string;
}

export interface IssueEntry {
  id: string;
  userId: string;
  date: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackEntry {
  id: string;
  userId: string;
  date: string;
  subject: string;
  type: FeedbackType;
  details: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteEntry {
  id: string;
  userId: string;
  date: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  totalTasks: number;
  completedTasks: number;
  openIssues: number;
  feedbackCount: number;
  notesCount: number;
}

export interface RecentEntries {
  tasks: TaskEntry[];
  issues: IssueEntry[];
  feedback: FeedbackEntry[];
  notes: NoteEntry[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  error: string;
  details?: Record<string, string[]>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: UserProfile;
  tokens: AuthTokens;
}
