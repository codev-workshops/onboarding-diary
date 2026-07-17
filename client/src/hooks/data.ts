import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Department, TaskCategory, User } from '@/lib/types';

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api<TaskCategory[]>('/categories'),
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: () => api<Department[]>('/departments'),
  });
}

export function useUsers(enabled = true) {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api<User[]>('/users'),
    enabled,
  });
}
