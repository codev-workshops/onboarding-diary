import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/api-client';
import type { User } from '../../shared/types';

export const useRecruits = (enabled: boolean) =>
  useQuery({
    queryKey: ['recruits'],
    enabled,
    queryFn: async () => {
      const { data } = await apiClient.get<User[]>('/api/users/recruits');
      return data;
    },
  });
