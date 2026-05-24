import type { AuthResponse, LoginInput, RegisterInput } from '@onboarding-diary/shared';
import { apiClient } from './client';

export const authApi = {
  async register(input: RegisterInput): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', input);
    return data;
  },

  async login(input: LoginInput): Promise<AuthResponse> {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', input);
    return data;
  },

  async refresh(refreshToken: string) {
    const { data } = await apiClient.post('/auth/refresh', { refresh_token: refreshToken });
    return data;
  },

  async logout(refreshToken: string) {
    await apiClient.post('/auth/logout', { refresh_token: refreshToken });
  },
};
