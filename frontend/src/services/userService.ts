import api from './api';
import { User } from '@/types/auth';
import { PageResponse } from '@/types/common';

export const userService = {
  getCurrentUser: () =>
    api.get<User>('/users/me').then((res) => res.data),

  updateProfile: (data: { name?: string; department?: string; bio?: string; profileImageUrl?: string }) =>
    api.put<User>('/users/me', data).then((res) => res.data),

  listUsers: (page = 0, size = 20) =>
    api.get<PageResponse<User>>('/users', { params: { page, size } }).then((res) => res.data),

  adminUpdateUser: (userId: string, data: { role?: string; active?: boolean }) =>
    api.put<User>(`/users/${userId}`, data).then((res) => res.data),

  deactivateUser: (userId: string) =>
    api.post<void>(`/users/${userId}/deactivate`).then((res) => res.data),

  activateUser: (userId: string) =>
    api.post<void>(`/users/${userId}/activate`).then((res) => res.data),

  assignRecruit: (managerId: string, recruitId: string) =>
    api.post<void>(`/users/${managerId}/recruits/${recruitId}`).then((res) => res.data),

  getRecruits: (managerId: string) =>
    api.get<User[]>(`/users/${managerId}/recruits`).then((res) => res.data),
};
