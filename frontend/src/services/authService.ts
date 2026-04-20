import api from './api';
import { LoginRequest, RegisterRequest, LoginResponse } from '@/types/auth';

export const authService = {
  login: (data: LoginRequest) =>
    api.post<LoginResponse>('/auth/login', data).then((res) => res.data),

  register: (data: RegisterRequest) =>
    api.post<LoginResponse>('/auth/register', data).then((res) => res.data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data).then((res) => res.data),
};
