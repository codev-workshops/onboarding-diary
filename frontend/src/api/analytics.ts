import { apiClient } from "./client";

export interface TaskCompletionPoint {
  date: string;
  total: number;
  completed: number;
  completionRate: number;
}

export interface ActivityVolumePoint {
  date: string;
  tasks: number;
  issues: number;
  feedback: number;
  notes: number;
  total: number;
}

export interface AnalyticsResponse {
  dateFrom: string | null;
  dateTo: string | null;
  taskCompletionTrend: TaskCompletionPoint[];
  issueSeverityDistribution: Record<string, number>;
  issueStatusDistribution: Record<string, number>;
  feedbackTypeDistribution: Record<string, number>;
  activityVolumeTrend: ActivityVolumePoint[];
}

export interface AnalyticsParams {
  dateFrom?: string;
  dateTo?: string;
}

export const analyticsApi = {
  load: async (params: AnalyticsParams = {}): Promise<AnalyticsResponse> => {
    const query: Record<string, string> = {};
    if (params.dateFrom) query.dateFrom = params.dateFrom;
    if (params.dateTo) query.dateTo = params.dateTo;
    const { data } = await apiClient.get<AnalyticsResponse>("/analytics", { params: query });
    return data;
  },
};
