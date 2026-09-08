import type { UserRole } from './auth';
import { apiRequest } from './client';
import type { Paged } from './tasks';
import { queryString } from './tasks';

export const userRoles: UserRole[] = ['Recruit', 'Manager', 'Admin'];

export interface AdminUser {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  departmentId: number | null;
  departmentName: string | null;
  managerId: number | null;
  managerName: string | null;
  startDate: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface AdminUserFilters {
  q?: string;
  role?: UserRole | '';
  departmentId?: number;
  managerId?: number;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  departmentId: number | null;
  managerId: number | null;
  startDate: string | null;
}

export interface UpdateUserPayload {
  fullName: string;
  role: UserRole;
  departmentId: number | null;
  managerId: number | null;
  startDate: string | null;
  isActive: boolean;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  recruits: number;
  managers: number;
  admins: number;
  unassignedRecruits: number;
  taskCount: number;
  openIssueCount: number;
}

export const listUsers = (filters: AdminUserFilters) =>
  apiRequest<Paged<AdminUser>>(`/admin/users${queryString(filters)}`);

export const createUser = (payload: CreateUserPayload) =>
  apiRequest<AdminUser>('/admin/users', { method: 'POST', body: payload });

export const updateUser = (id: number, payload: UpdateUserPayload) =>
  apiRequest<AdminUser>(`/admin/users/${id}`, { method: 'PATCH', body: payload });

export const getAdminStats = () => apiRequest<AdminStats>('/admin/stats');
