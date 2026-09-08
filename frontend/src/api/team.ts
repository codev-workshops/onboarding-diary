import { apiRequest } from './client';
import type { Paged } from './tasks';
import { queryString } from './tasks';

export interface TeamMember {
  userId: number;
  fullName: string;
  email: string;
  departmentName: string | null;
  startDate: string | null;
  managerId: number | null;
  managerName: string | null;
  isActive: boolean;
  taskCount: number;
  completionPercentage: number;
  openIssueCount: number;
  lastActivityAt: string | null;
}

export interface TeamFilters {
  q?: string;
  managerId?: number;
  page?: number;
  pageSize?: number;
  sort?: string;
}

export const listTeamRecruits = (filters: TeamFilters) =>
  apiRequest<Paged<TeamMember>>(`/team/recruits${queryString(filters)}`);

export const getTeamRecruit = (userId: number) =>
  apiRequest<TeamMember>(`/team/recruits/${userId}`);
