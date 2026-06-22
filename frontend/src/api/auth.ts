import apiClient from './client';
import type { AuthResponse } from '../types';

export async function login(username: string, password: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', { username, password });
  return data;
}

export async function register(username: string, email: string, password: string): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', { username, email, password });
  return data;
}
