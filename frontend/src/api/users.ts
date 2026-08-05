import { apiFetch } from './client';
import type { UpdateUserRequest, User, UserRole } from './types';

export const listUsers = (params: { role?: UserRole; department?: string } = {}) => {
  const search = new URLSearchParams();
  if (params.role) search.set('role', params.role);
  if (params.department) search.set('department', params.department);
  const query = search.toString();
  return apiFetch<User[]>(`/api/users${query ? `?${query}` : ''}`);
};

export const getUser = (id: string) => apiFetch<User>(`/api/users/${id}`);

export const listRecruits = (managerId: string) => apiFetch<User[]>(`/api/users/${managerId}/recruits`);

export const updateUser = (id: string, body: UpdateUserRequest) =>
  apiFetch<User>(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(body) });

export const deactivateUser = (id: string) => apiFetch<void>(`/api/users/${id}`, { method: 'DELETE' });
