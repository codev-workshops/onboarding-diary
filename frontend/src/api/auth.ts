import { apiClient } from './client';
import type { AuthResponse, ProfileUpdateRequest, SignupRequest, User } from './types';

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', { email, password });
  return data;
}

export async function signup(request: SignupRequest): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/signup', request);
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>('/auth/me');
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.put('/auth/password', { currentPassword, newPassword });
}

export async function updateProfile(request: ProfileUpdateRequest): Promise<User> {
  const { data } = await apiClient.put<User>('/profile', request);
  return data;
}
