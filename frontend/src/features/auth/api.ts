import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/api-client';
import type { AuthResponse, User } from '../../shared/types';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload extends LoginPayload {
  fullName: string;
  department?: string;
  startDate?: string;
}

export const useLogin = () =>
  useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { data } = await apiClient.post<AuthResponse>('/api/auth/login', payload);
      return data;
    },
  });

export const useSignup = () =>
  useMutation({
    mutationFn: async (payload: SignupPayload) => {
      const { data } = await apiClient.post<AuthResponse>('/api/auth/signup', payload);
      return data;
    },
  });

export const useProfile = (enabled: boolean) =>
  useQuery({
    queryKey: ['auth', 'me'],
    enabled,
    queryFn: async () => {
      const { data } = await apiClient.get<User>('/api/auth/me');
      return data;
    },
  });
