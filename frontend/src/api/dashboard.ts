import apiClient from './client'
import type { DashboardData } from '../types'

export const dashboardApi = {
  get: () => apiClient.get<DashboardData>('/dashboard'),

  getForUser: (userId: string) =>
    apiClient.get<DashboardData>(`/dashboard/user/${userId}`),
}
