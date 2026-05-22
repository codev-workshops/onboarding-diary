import apiClient from './client'
import type { Feedback, PageResponse } from '../types'

export const feedbackApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    apiClient.get<PageResponse<Feedback>>('/feedback', { params }),

  getById: (id: string) => apiClient.get<Feedback>(`/feedback/${id}`),

  create: (data: Record<string, unknown>) =>
    apiClient.post<Feedback>('/feedback', data),

  update: (id: string, data: Record<string, unknown>) =>
    apiClient.put<Feedback>(`/feedback/${id}`, data),

  delete: (id: string) => apiClient.delete(`/feedback/${id}`),

  listForUser: (userId: string, params?: Record<string, string | number | undefined>) =>
    apiClient.get<PageResponse<Feedback>>(`/feedback/user/${userId}`, { params }),
}
