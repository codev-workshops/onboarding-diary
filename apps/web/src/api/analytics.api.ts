import type {
  ApiResponse,
  AnalyticsOverviewDto,
  TaskCompletionTrendsDto,
  IssueTrendsDto,
  FeedbackSentimentDto,
  RecruitActivityDto,
  AnalyticsParams,
} from '@onboarding-diary/shared';
import { apiClient } from './client';

function toQueryParams(params: AnalyticsParams): Record<string, string> {
  const query: Record<string, string> = {};
  if (params.from_date) query.from_date = params.from_date;
  if (params.to_date) query.to_date = params.to_date;
  if (params.granularity) query.granularity = params.granularity;
  if (params.recruit_id) query.recruit_id = params.recruit_id;
  return query;
}

export const analyticsApi = {
  async getOverview(params: AnalyticsParams = {}): Promise<AnalyticsOverviewDto> {
    const { data } = await apiClient.get<ApiResponse<AnalyticsOverviewDto>>('/analytics', {
      params: toQueryParams(params),
    });
    return data.data;
  },

  async getTaskTrends(params: AnalyticsParams = {}): Promise<TaskCompletionTrendsDto> {
    const { data } = await apiClient.get<ApiResponse<TaskCompletionTrendsDto>>('/analytics/tasks', {
      params: toQueryParams(params),
    });
    return data.data;
  },

  async getIssueTrends(params: AnalyticsParams = {}): Promise<IssueTrendsDto> {
    const { data } = await apiClient.get<ApiResponse<IssueTrendsDto>>('/analytics/issues', {
      params: toQueryParams(params),
    });
    return data.data;
  },

  async getFeedbackSentiment(params: AnalyticsParams = {}): Promise<FeedbackSentimentDto> {
    const { data } = await apiClient.get<ApiResponse<FeedbackSentimentDto>>(
      '/analytics/feedback',
      { params: toQueryParams(params) },
    );
    return data.data;
  },

  async getRecruitActivity(params: AnalyticsParams = {}): Promise<RecruitActivityDto> {
    const { data } = await apiClient.get<ApiResponse<RecruitActivityDto>>('/analytics/activity', {
      params: toQueryParams(params),
    });
    return data.data;
  },
};
