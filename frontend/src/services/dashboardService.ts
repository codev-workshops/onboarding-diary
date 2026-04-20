import api from './api';
import { DashboardResponse } from '@/types/common';

export const dashboardService = {
  getDashboard: () =>
    api.get<DashboardResponse>('/dashboard').then((res) => res.data),

  getRecruitDashboard: (recruitId: string) =>
    api.get<DashboardResponse>(`/dashboard/recruit/${recruitId}`).then((res) => res.data),

  getAdminDashboard: () =>
    api.get<DashboardResponse>('/dashboard/admin').then((res) => res.data),
};
