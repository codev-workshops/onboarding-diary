export enum UserRole {
  Recruit = 'Recruit',
  Manager = 'Manager',
  Admin = 'Admin',
}

export enum TaskEntryStatus {
  NotStarted = 'NotStarted',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Blocked = 'Blocked',
}

export enum Priority {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical',
}

export enum IssueSeverity {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical',
}

export enum IssueStatus {
  Open = 'Open',
  InProgress = 'InProgress',
  Resolved = 'Resolved',
  Closed = 'Closed',
}

export enum FeedbackType {
  Positive = 'Positive',
  Suggestion = 'Suggestion',
  Concern = 'Concern',
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  expiresIn: number;
  user: AuthUser;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  department: string;
  startDate: string;
}

export interface RegisterResponse {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  startDate: string;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  department: string;
  startDate: string;
  managerId: number | null;
  managerName: string | null;
  createdAt: string;
}

export interface UpdateProfileRequest {
  name: string;
  department: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface ErrorResponse {
  statusCode: number;
  message: string;
  errors?: string[];
}

export interface TaskResponse {
  id: number;
  userId: number;
  date: string;
  title: string;
  description: string | null;
  category: string;
  status: TaskEntryStatus;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  date: string;
  title: string;
  description?: string;
  category: string;
  status: TaskEntryStatus;
  priority: Priority;
}

export interface UpdateTaskRequest {
  date?: string;
  title?: string;
  description?: string;
  category?: string;
  status?: TaskEntryStatus;
  priority?: Priority;
}

export interface TaskFilters {
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  status?: TaskEntryStatus;
  priority?: Priority;
  userId?: number;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDescending?: boolean;
}
