import { apiFetch } from './client';
import type { AuthResponse, LoginRequest, SignupRequest, UpdateProfileRequest, User } from './types';

export const login = (body: LoginRequest) =>
  apiFetch<AuthResponse>('/api/auth/login', { method: 'POST', body: JSON.stringify(body) });

export const signup = (body: SignupRequest) =>
  apiFetch<AuthResponse>('/api/auth/signup', { method: 'POST', body: JSON.stringify(body) });

export const getCurrentUser = () => apiFetch<User>('/api/auth/me');

export const updateProfile = (body: UpdateProfileRequest) =>
  apiFetch<User>('/api/users/me', { method: 'PUT', body: JSON.stringify(body) });
