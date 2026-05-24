import type {
  ApiResponse,
  RecruitDashboardDto,
  ManagerDashboardDto,
  AdminDashboardDto,
} from '@onboarding-diary/shared';
import { apiClient } from './client';

export const dashboardApi = {
  async getRecruitDashboard(): Promise<RecruitDashboardDto> {
    const { data } = await apiClient.get<ApiResponse<RecruitDashboardDto>>('/dashboard/recruit');
    return data.data;
  },

  async getManagerDashboard(): Promise<ManagerDashboardDto> {
    const { data } = await apiClient.get<ApiResponse<ManagerDashboardDto>>('/dashboard/manager');
    return data.data;
  },

  async getAdminDashboard(): Promise<AdminDashboardDto> {
    const { data } = await apiClient.get<ApiResponse<AdminDashboardDto>>('/dashboard/admin');
    return data.data;
  },
};
