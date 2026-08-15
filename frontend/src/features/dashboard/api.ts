import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/api-client';
import type { AdminDashboard, DashboardSummary, ManagerDashboard } from '../../shared/types';

export function useDashboardSummary(recruitId: number | null) {
  return useQuery({
    queryKey: ['dashboard', recruitId],
    queryFn: async () => {
      const { data } = await apiClient.get<DashboardSummary>('/api/dashboard/summary', {
        params: recruitId ? { recruitId } : undefined,
      });
      return data;
    },
  });
}

export function useManagerDashboard(enabled: boolean) {
  return useQuery({
    queryKey: ['dashboard', 'manager'],
    enabled,
    queryFn: async () => {
      const { data } = await apiClient.get<ManagerDashboard>('/api/dashboard/manager');
      return data;
    },
  });
}

export function useAdminDashboard(enabled: boolean) {
  return useQuery({
    queryKey: ['dashboard', 'admin'],
    enabled,
    queryFn: async () => {
      const { data } = await apiClient.get<AdminDashboard>('/api/dashboard/admin');
      return data;
    },
  });
}
