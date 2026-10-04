import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { TokenResponse } from './types';

let accessToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;
let onSessionExpired: () => void = () => {};

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function setSessionExpiredHandler(handler: () => void): void {
  onSessionExpired = handler;
}

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

const authClient = axios.create({ baseURL: '/api', withCredentials: true });

/** Exchanges the HttpOnly refresh cookie for a new access token. Concurrent calls share one request. */
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = authClient
      .post<TokenResponse>('/auth/refresh')
      .then((response) => {
        setAccessToken(response.data.accessToken);
        return response.data.accessToken;
      })
      .catch(() => {
        setAccessToken(null);
        return null;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

const NO_REFRESH_PATHS = ['/auth/login', '/auth/signup', '/auth/refresh', '/auth/logout'];

type RetriableConfig = InternalAxiosRequestConfig & { retried?: boolean };

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const skipRefresh = NO_REFRESH_PATHS.some((path) => config?.url?.startsWith(path));
    if (error.response?.status !== 401 || !config || config.retried || skipRefresh) {
      return Promise.reject(error);
    }
    config.retried = true;
    const token = await refreshAccessToken();
    if (!token) {
      onSessionExpired();
      return Promise.reject(error);
    }
    config.headers.Authorization = `Bearer ${token}`;
    return apiClient(config);
  },
);
