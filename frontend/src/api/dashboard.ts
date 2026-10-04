import { apiClient } from './client';
import type { FeedbackType, Issue, IssueSeverity, TaskStatus } from './diaryTypes';

export interface WeeklyCount {
  weekStart: string;
  completed: number;
}

export interface DashboardSummary {
  startDate: string;
  daysSinceStart: number;
  tasks: { total: number; byStatus: Record<TaskStatus, number>; completionPct: number };
  issues: { open: number; openBySeverity: Record<IssueSeverity, number> };
  feedback: { total: number; byType: Record<FeedbackType, number> };
  notes: { total: number };
  weeklyCompletedTrend: WeeklyCount[];
  topOpenIssues: Issue[];
}

export type RecentEntryType = 'TASK' | 'ISSUE' | 'FEEDBACK' | 'NOTE';

export interface RecentEntry {
  type: RecentEntryType;
  id: number;
  entryDate: string;
  title: string;
  status: string | null;
  updatedAt: string;
}

/** API paths of a dashboard: the caller's own, or a recruit's as seen by their manager. */
export interface DashboardSource {
  summaryPath: string;
  recentPath: string;
}

export const OWN_DASHBOARD: DashboardSource = {
  summaryPath: '/dashboard/summary',
  recentPath: '/dashboard/recent',
};

export async function fetchDashboardSummary(source: DashboardSource): Promise<DashboardSummary> {
  const { data } = await apiClient.get<DashboardSummary>(source.summaryPath);
  return data;
}

export async function fetchRecentEntries(
  source: DashboardSource,
  limit = 5,
): Promise<RecentEntry[]> {
  const { data } = await apiClient.get<RecentEntry[]>(source.recentPath, { params: { limit } });
  return data;
}
