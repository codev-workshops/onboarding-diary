import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/api-client';
import type { DashboardSummary } from '../../shared/types';

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
