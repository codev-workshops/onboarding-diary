import api from './api';
import {
  DashboardSummaryDto,
  RecruitOverviewDto,
  SystemOverviewDto,
} from '@/types';

export async function getRecruitDashboard(): Promise<DashboardSummaryDto> {
  const response = await api.get<DashboardSummaryDto>('/dashboard');
  return response.data;
}

export async function getManagerDashboard(): Promise<RecruitOverviewDto[]> {
  const response = await api.get<RecruitOverviewDto[]>('/dashboard/recruits');
  return response.data;
}

export async function getSystemDashboard(): Promise<SystemOverviewDto> {
  const response = await api.get<SystemOverviewDto>('/dashboard/system');
  return response.data;
}
