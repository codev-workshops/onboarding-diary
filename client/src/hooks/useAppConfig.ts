import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AppConfig } from '@/lib/types';

/** Fetches public runtime config (demo mode / onboarding enablers). */
export function useAppConfig() {
  return useQuery({
    queryKey: ['config'],
    queryFn: () => api<AppConfig>('/config'),
    staleTime: 5 * 60 * 1000,
  });
}
