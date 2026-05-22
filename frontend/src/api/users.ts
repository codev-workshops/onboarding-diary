import apiClient from './client'
import type { User, PageResponse } from '../types'

export const usersApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    apiClient.get<PageResponse<User>>('/users', { params }),

  getById: (id: string) => apiClient.get<User>(`/users/${id}`),

  update: (id: string, data: Record<string, unknown>) =>
    apiClient.put<User>(`/users/${id}`, data),

  create: (data: Record<string, unknown>) =>
    apiClient.post<User>('/users', data),
}
