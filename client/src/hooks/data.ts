import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  ChecklistTemplate,
  Comment,
  Department,
  DemoCredentials,
  MentionsResponse,
  TaskCategory,
  TeamOverview,
  User,
} from '@/lib/types';

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

/**
 * Team overview for managers/admins (docs/ASSUMPTIONS.md §15). One progress row
 * per overseen recruit.
 */
export function useTeamOverview(enabled = true) {
  return useQuery({
    queryKey: ['team'],
    queryFn: () => api<TeamOverview>('/dashboard/team'),
    enabled,
  });
}

/**
 * Demo credentials helper (docs/ASSUMPTIONS.md §16). Only fetch when onboarding
 * enablers are active; the endpoint 404s outside demo mode.
 */
export function useDemoCredentials(enabled: boolean) {
  return useQuery({
    queryKey: ['demo-credentials'],
    queryFn: () => api<DemoCredentials>('/config/demo'),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/** Admin-managed onboarding checklist templates (docs/ASSUMPTIONS.md §17). */
export function useTemplates(enabled = true) {
  return useQuery({
    queryKey: ['templates'],
    queryFn: () => api<ChecklistTemplate[]>('/templates'),
    enabled,
  });
}

/** Comments on a task (docs/ASSUMPTIONS.md §19). */
export function useComments(taskId: string | null) {
  return useQuery({
    queryKey: ['comments', taskId],
    queryFn: () => api<Comment[]>(`/tasks/${taskId}/comments`),
    enabled: !!taskId,
  });
}

/**
 * Current user's @mention activity + unread count (docs/ASSUMPTIONS.md §19).
 * Polls periodically so the header badge stays fresh.
 */
export function useMentions(enabled = true) {
  return useQuery({
    queryKey: ['mentions'],
    queryFn: () => api<MentionsResponse>('/mentions'),
    enabled,
    refetchInterval: 30_000,
  });
}
