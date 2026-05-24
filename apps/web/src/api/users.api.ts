import type { PaginatedResponse, ApiResponse } from '@onboarding-diary/shared';
import { apiClient } from './client';

export interface UserDto {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  avatar_url: string | null;
  created_at: string;
  recruit_profile?: {
    department: string | null;
    position: string | null;
    start_date: string | null;
  };
}

export interface AssignmentDto {
  id: string;
  manager_id: string;
  recruit_id: string;
  is_active: boolean;
  assigned_at: string;
  manager?: { id: string; first_name: string; last_name: string; email: string };
  recruit?: { id: string; first_name: string; last_name: string; email: string };
}

export const usersApi = {
  async list(params?: Record<string, string | number | undefined>): Promise<PaginatedResponse<UserDto>> {
    const { data } = await apiClient.get<PaginatedResponse<UserDto>>('/users', { params });
    return data;
  },

  async getById(id: string): Promise<UserDto> {
    const { data } = await apiClient.get<ApiResponse<UserDto>>(`/users/${id}`);
    return data.data;
  },

  async updateRole(id: string, role: string): Promise<UserDto> {
    const { data } = await apiClient.patch<ApiResponse<UserDto>>(`/users/${id}/role`, { role });
    return data.data;
  },

  async updateStatus(id: string, status: string): Promise<UserDto> {
    const { data } = await apiClient.patch<ApiResponse<UserDto>>(`/users/${id}/status`, { status });
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  },
};

export const assignmentsApi = {
  async list(params?: Record<string, string | number | undefined>): Promise<PaginatedResponse<AssignmentDto>> {
    const { data } = await apiClient.get<PaginatedResponse<AssignmentDto>>('/assignments', { params });
    return data;
  },

  async create(input: { manager_id: string; recruit_id: string }): Promise<AssignmentDto> {
    const { data } = await apiClient.post<ApiResponse<AssignmentDto>>('/assignments', input);
    return data.data;
  },

  async unassign(id: string): Promise<void> {
    await apiClient.patch(`/assignments/${id}/unassign`);
  },
};
