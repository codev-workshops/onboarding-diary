import api from './api';
import {
  TaskResponse,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskFilters,
  PaginatedResponse,
} from '@/types';

export async function getTasks(
  filters: TaskFilters = {}
): Promise<PaginatedResponse<TaskResponse>> {
  const params: Record<string, string | number | boolean> = {};

  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  if (filters.category) params.category = filters.category;
  if (filters.status) params.status = filters.status;
  if (filters.priority) params.priority = filters.priority;
  if (filters.userId) params.userId = filters.userId;
  if (filters.page) params.page = filters.page;
  if (filters.pageSize) params.pageSize = filters.pageSize;
  if (filters.sortBy) params.sortBy = filters.sortBy;
  if (filters.sortDescending !== undefined)
    params.sortDescending = filters.sortDescending;

  const response = await api.get<PaginatedResponse<TaskResponse>>('/tasks', {
    params,
  });
  return response.data;
}

export async function getTask(id: number): Promise<TaskResponse> {
  const response = await api.get<TaskResponse>(`/tasks/${id}`);
  return response.data;
}

export async function createTask(
  data: CreateTaskRequest
): Promise<TaskResponse> {
  const response = await api.post<TaskResponse>('/tasks', data);
  return response.data;
}

export async function updateTask(
  id: number,
  data: UpdateTaskRequest
): Promise<TaskResponse> {
  const response = await api.put<TaskResponse>(`/tasks/${id}`, data);
  return response.data;
}

export async function deleteTask(id: number): Promise<void> {
  await api.delete(`/tasks/${id}`);
}
