import api from './api';
import { TaskEntry, CreateTaskRequest, UpdateTaskRequest, TaskFilterParams } from '@/types/task';
import { PageResponse } from '@/types/common';

export const taskService = {
  create: (data: CreateTaskRequest) =>
    api.post<TaskEntry>('/tasks', data).then((res) => res.data),

  list: (params?: TaskFilterParams & { page?: number; size?: number }) =>
    api.get<PageResponse<TaskEntry>>('/tasks', { params }).then((res) => res.data),

  getById: (id: string) =>
    api.get<TaskEntry>(`/tasks/${id}`).then((res) => res.data),

  update: (id: string, data: UpdateTaskRequest) =>
    api.put<TaskEntry>(`/tasks/${id}`, data).then((res) => res.data),

  delete: (id: string) =>
    api.delete<void>(`/tasks/${id}`).then((res) => res.data),

  listForUser: (userId: string, params?: { page?: number; size?: number }) =>
    api.get<PageResponse<TaskEntry>>(`/tasks/user/${userId}`, { params }).then((res) => res.data),
};
