export type TaskCategory = 'ORIENTATION' | 'TRAINING' | 'DOCUMENTATION' | 'MEETING' | 'SHADOWING' | 'SETUP' | 'OTHER';
export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface TaskEntry {
  id: string;
  userId: string;
  date: string;
  title: string;
  description: string;
  category: TaskCategory;
  status: TaskStatus;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  date: string;
  title: string;
  description: string;
  category?: TaskCategory;
  status?: TaskStatus;
  priority?: Priority;
}

export interface UpdateTaskRequest extends CreateTaskRequest {}

export interface TaskFilterParams {
  status?: TaskStatus;
  category?: TaskCategory;
  priority?: Priority;
  dateFrom?: string;
  dateTo?: string;
}
