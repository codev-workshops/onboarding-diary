import type {
  AdminDashboardDto,
  DashboardDto,
  DirectReportSummaryDto,
} from '@onboarding-diary/shared';
import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { queryKeys } from '../../app/queryKeys.js';
import { useApiClient } from '../../lib/ApiClientContext.js';

export function useDashboard(ownerId?: string): UseQueryResult<DashboardDto> {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.dashboard.detail(ownerId),
    queryFn: async () => {
      const response = await client.get<{ data: DashboardDto }>('/dashboard', {
        ...(ownerId === undefined ? {} : { query: { ownerId } }),
      });
      return response.data;
    },
  });
}

export function useAdminDashboard(): UseQueryResult<AdminDashboardDto> {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.dashboard.admin,
    queryFn: async () => {
      const response = await client.get<{ data: AdminDashboardDto }>('/dashboard/admin');
      return response.data;
    },
  });
}

export function useDirectReports(): UseQueryResult<DirectReportSummaryDto[]> {
  const client = useApiClient();
  return useQuery({
    queryKey: queryKeys.users.directReports,
    queryFn: async () => {
      const response = await client.get<{ data: DirectReportSummaryDto[] }>(
        '/users/me/direct-reports',
      );
      return response.data;
    },
  });
}
