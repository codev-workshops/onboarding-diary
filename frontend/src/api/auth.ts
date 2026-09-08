import { apiRequest } from './client';

export type UserRole = 'Recruit' | 'Manager' | 'Admin';

export interface UserProfile {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  departmentId: number | null;
  departmentName: string | null;
  startDate: string | null;
}

export interface AuthResponse {
  accessToken: string;
  expiresAt: string;
  user: UserProfile;
}

export interface Department {
  id: number;
  name: string;
}

export interface SignupPayload {
  email: string;
  password: string;
  fullName: string;
  departmentId: number | null;
  startDate: string;
}

export const login = (email: string, password: string) =>
  apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } });

export const signup = (payload: SignupPayload) =>
  apiRequest<AuthResponse>('/auth/signup', { method: 'POST', body: payload });

export const getProfile = () => apiRequest<UserProfile>('/me');

export const updateProfile = (payload: {
  fullName: string;
  departmentId: number | null;
  startDate: string | null;
}) => apiRequest<UserProfile>('/me', { method: 'PATCH', body: payload });

export const changePassword = (currentPassword: string, newPassword: string) =>
  apiRequest<void>('/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  });

export const listDepartments = () => apiRequest<Department[]>('/departments');
