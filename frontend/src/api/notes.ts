import apiClient from './client'
import type { Note, PageResponse } from '../types'

export const notesApi = {
  list: (params?: Record<string, string | number | undefined>) =>
    apiClient.get<PageResponse<Note>>('/notes', { params }),

  getById: (id: string) => apiClient.get<Note>(`/notes/${id}`),

  create: (data: Record<string, unknown>) =>
    apiClient.post<Note>('/notes', data),

  update: (id: string, data: Record<string, unknown>) =>
    apiClient.put<Note>(`/notes/${id}`, data),

  delete: (id: string) => apiClient.delete(`/notes/${id}`),
}
