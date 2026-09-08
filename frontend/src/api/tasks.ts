import { apiRequest } from './client';

export type TaskCategory =
  'Training' | 'Setup' | 'Meeting' | 'Documentation' | 'Coding' | 'Shadowing' | 'Other';

export type TaskStatus = 'Todo' | 'InProgress' | 'Blocked' | 'Done';

export type TaskPriority = 'Low' | 'Medium' | 'High';

export const taskCategories: TaskCategory[] = [
  'Training',
  'Setup',
  'Meeting',
  'Documentation',
  'Coding',
  'Shadowing',
  'Other',
];

export const taskStatuses: TaskStatus[] = ['Todo', 'InProgress', 'Blocked', 'Done'];

export const taskPriorities: TaskPriority[] = ['Low', 'Medium', 'High'];

export const statusLabels: Record<TaskStatus, string> = {
  Todo: 'To do',
  InProgress: 'In progress',
  Blocked: 'Blocked',
  Done: 'Done',
};

export interface Task {
  id: number;
  userId: number;
  entryDate: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  updatedAt: string;
}

export interface TaskPayload {
  entryDate: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
}

export interface TaskFilters {
  from?: string;
  to?: string;
  category?: TaskCategory | '';
  status?: TaskStatus | '';
  priority?: TaskPriority | '';
  q?: string;
  userId?: number;
  page?: number;
  pageSize?: number;
}

export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export function queryString<T extends object>(filters: T): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  return query === '' ? '' : `?${query}`;
}

export const listTasks = (filters: TaskFilters) =>
  apiRequest<Paged<Task>>(`/tasks${queryString(filters)}`);

export const createTask = (payload: TaskPayload) =>
  apiRequest<Task>('/tasks', { method: 'POST', body: payload });

export const updateTask = (id: number, payload: TaskPayload) =>
  apiRequest<Task>(`/tasks/${id}`, { method: 'PATCH', body: payload });

export const deleteTask = (id: number) => apiRequest<void>(`/tasks/${id}`, { method: 'DELETE' });

export interface ActivityItem {
  kind: 'Task' | 'Issue' | 'Feedback' | 'Note';
  id: number;
  entryDate: string;
  title: string;
  detail: string;
  updatedAt: string;
}

export interface DashboardSummary {
  userId: number;
  tasks: { total: number; done: number; open: number; completionPercentage: number };
  issues: {
    total: number;
    open: number;
    openBySeverity: Partial<Record<'Low' | 'Medium' | 'High' | 'Critical', number>>;
  };
  feedbackCount: number;
  noteCount: number;
  recentTasks: Task[];
  recentActivity: ActivityItem[];
}

export const getDashboard = (userId?: number) =>
  apiRequest<DashboardSummary>(`/dashboard${userId === undefined ? '' : `?userId=${userId}`}`);
