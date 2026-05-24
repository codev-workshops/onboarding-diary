import type { PaginatedResponse, ApiResponse } from '@onboarding-diary/shared';
import { apiClient } from './client';

export interface TaskEntryDto {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  visibility: string;
  due_date: string | null;
  completed_at: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  visibility?: string;
  due_date?: string;
  tags?: string[];
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {}

export const tasksApi = {
  async list(params?: Record<string, string | number | undefined>): Promise<PaginatedResponse<TaskEntryDto>> {
    const { data } = await apiClient.get<PaginatedResponse<TaskEntryDto>>('/tasks', { params });
    return data;
  },

  async getById(id: string): Promise<TaskEntryDto> {
    const { data } = await apiClient.get<ApiResponse<TaskEntryDto>>(`/tasks/${id}`);
    return data.data;
  },

  async create(input: CreateTaskInput): Promise<TaskEntryDto> {
    const { data } = await apiClient.post<ApiResponse<TaskEntryDto>>('/tasks', input);
    return data.data;
  },

  async update(id: string, input: UpdateTaskInput): Promise<TaskEntryDto> {
    const { data } = await apiClient.patch<ApiResponse<TaskEntryDto>>(`/tasks/${id}`, input);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/tasks/${id}`);
  },
};
