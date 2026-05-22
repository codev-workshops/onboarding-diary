import apiClient from './client'

export interface AnalyticsData {
  tasksByStatus: Record<string, number>
  tasksByCategory: Record<string, number>
  tasksByPriority: Record<string, number>
  issuesBySeverity: Record<string, number>
  issuesByStatus: Record<string, number>
  feedbackByType: Record<string, number>
  weeklyActivity: { week: string; tasks: number; issues: number; feedback: number; notes: number }[]
  taskCompletionRate: number
  totalEntries: number
}

export const analyticsApi = {
  get: () => apiClient.get<AnalyticsData>('/analytics'),

  getForUser: (userId: string) =>
    apiClient.get<AnalyticsData>(`/analytics/user/${userId}`),
}
