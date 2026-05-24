// ── Shared Analytics Types ──────────────────────────────────────

export interface DateCountPoint {
  date: string;
  count: number;
}

export interface StatusDatePoint {
  date: string;
  pending: number;
  in_progress: number;
  completed: number;
  blocked: number;
}

export interface IssueStatusDatePoint {
  date: string;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
}

export interface SentimentBreakdown {
  type: string;
  count: number;
  percentage: number;
}

export interface RecruitActivityPoint {
  date: string;
  tasks: number;
  issues: number;
  notes: number;
  feedback: number;
}

// ── API Response DTOs ──────────────────────────────────────────

export interface TaskCompletionTrendsDto {
  daily: StatusDatePoint[];
  summary: {
    total: number;
    completed: number;
    completion_rate: number;
    avg_daily_completed: number;
  };
}

export interface IssueTrendsDto {
  daily: IssueStatusDatePoint[];
  summary: {
    total: number;
    open: number;
    resolved: number;
    avg_resolution_time_hours: number | null;
  };
}

export interface FeedbackSentimentDto {
  breakdown: SentimentBreakdown[];
  total: number;
  avg_rating: number | null;
  rating_distribution: { rating: number; count: number }[];
}

export interface RecruitActivityDto {
  daily: RecruitActivityPoint[];
  summary: {
    total_entries: number;
    most_active_day: string | null;
    avg_daily_entries: number;
  };
}

export interface AnalyticsOverviewDto {
  task_trends: TaskCompletionTrendsDto;
  issue_trends: IssueTrendsDto;
  feedback_sentiment: FeedbackSentimentDto;
  recruit_activity: RecruitActivityDto;
}

export type AnalyticsGranularity = 'daily' | 'weekly' | 'monthly';

export interface AnalyticsParams {
  from_date?: string;
  to_date?: string;
  granularity?: AnalyticsGranularity;
  recruit_id?: string;
}
