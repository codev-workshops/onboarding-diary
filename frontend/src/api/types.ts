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
