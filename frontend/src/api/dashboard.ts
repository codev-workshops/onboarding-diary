import { apiFetch } from './client';
import type { DashboardSummary } from './types';

export const getDashboardSummary = (userId?: string) =>
  apiFetch<DashboardSummary>(`/api/dashboard/summary${userId ? `?userId=${userId}` : ''}`);
