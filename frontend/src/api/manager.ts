import { apiClient } from './client';
import type { DashboardSource } from './dashboard';
import { toQuery, type ListParams } from './diary';
import type { DiaryResource, Issue, Page } from './diaryTypes';

export interface RecruitSummary {
  id: number;
  fullName: string;
  email: string;
  jobTitle: string | null;
  department: string;
  startDate: string;
  enabled: boolean;
  totalTasks: number;
  completedTasks: number;
  completionPct: number;
  openIssues: number;
  highSeverityOpenIssues: number;
  lastActivityAt: string | null;
  inactive: boolean;
  atRisk: boolean;
}

export interface TeamSummary {
  recruitCount: number;
  averageCompletionPct: number;
  openIssues: number;
  atRiskCount: number;
  recruits: RecruitSummary[];
  highSeverityIssues: { recruitId: number; recruitName: string; issue: Issue }[];
}

export async function fetchTeam(): Promise<TeamSummary> {
  const { data } = await apiClient.get<TeamSummary>('/dashboard/team');
  return data;
}

export async function fetchRecruits(): Promise<RecruitSummary[]> {
  const { data } = await apiClient.get<RecruitSummary[]>('/manager/recruits');
  return data;
}

export async function fetchRecruit(id: number): Promise<RecruitSummary> {
  const { data } = await apiClient.get<RecruitSummary>(`/manager/recruits/${id}`);
  return data;
}

export function recruitDashboardSource(id: number): DashboardSource {
  return {
    summaryPath: `/manager/recruits/${id}/dashboard`,
    recentPath: `/manager/recruits/${id}/recent`,
  };
}

export async function listRecruitEntries<T>(
  recruitId: number,
  resource: DiaryResource,
  params: ListParams,
): Promise<Page<T>> {
  const { data } = await apiClient.get<Page<T>>(`/manager/recruits/${recruitId}/${resource}`, {
    params: toQuery(params),
  });
  return data;
}
