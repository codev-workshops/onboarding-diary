import apiClient from './client'
import type { Task, PageResponse } from '../types'

export const tasksApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    apiClient.get<PageResponse<Task>>('/tasks', { params }),

  getById: (id: string) => apiClient.get<Task>(`/tasks/${id}`),

  create: (data: Record<string, unknown>) =>
    apiClient.post<Task>('/tasks', data),

  update: (id: string, data: Record<string, unknown>) =>
    apiClient.put<Task>(`/tasks/${id}`, data),

  delete: (id: string) => apiClient.delete(`/tasks/${id}`),

  listForUser: (userId: string, params?: Record<string, string | number | undefined>) =>
    apiClient.get<PageResponse<Task>>(`/tasks/user/${userId}`, { params }),
}
