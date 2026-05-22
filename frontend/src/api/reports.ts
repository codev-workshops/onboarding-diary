import apiClient from './client'
import type { ReportItem, PageResponse } from '../types'

export const reportsApi = {
  generate: (data: Record<string, unknown>) =>
    apiClient.post<ReportItem>('/reports/generate', data),

  list: (params?: Record<string, string | number | undefined>) =>
    apiClient.get<PageResponse<ReportItem>>('/reports', { params }),

  download: (reportId: string) =>
    apiClient.get(`/reports/${reportId}/download`, { responseType: 'blob' }),
}
