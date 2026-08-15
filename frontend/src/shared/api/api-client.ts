import axios, { AxiosError, type AxiosInstance } from 'axios';
import type { ApiErrorBody } from '../types';

const TOKEN_KEY = 'onboarding-diary.token';
const USER_KEY = 'onboarding-diary.user';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  userKey: USER_KEY,
};

export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5080',
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/api/auth/')) {
      tokenStorage.clear();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<ApiErrorBody>;
  const body = axiosError?.response?.data?.error;
  if (body) {
    return body.details.length > 0 ? body.details.join(' ') : body.message;
  }
  return axiosError?.message ?? 'Something went wrong.';
}
