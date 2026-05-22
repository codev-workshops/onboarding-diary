import apiClient from './client'
import type { Issue, PageResponse } from '../types'

export const issuesApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    apiClient.get<PageResponse<Issue>>('/issues', { params }),

  getById: (id: string) => apiClient.get<Issue>(`/issues/${id}`),

  create: (data: Record<string, unknown>) =>
    apiClient.post<Issue>('/issues', data),

  update: (id: string, data: Record<string, unknown>) =>
    apiClient.put<Issue>(`/issues/${id}`, data),

  delete: (id: string) => apiClient.delete(`/issues/${id}`),

  listForUser: (userId: string, params?: Record<string, string | number | undefined>) =>
    apiClient.get<PageResponse<Issue>>(`/issues/user/${userId}`, { params }),
}
