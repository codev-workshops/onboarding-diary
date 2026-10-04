import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const requests: string[] = [];

function respond(config: InternalAxiosRequestConfig, status: number, data: unknown = {}) {
  const response = { status, statusText: '', data, headers: {}, config };
  if (status >= 400) {
    return Promise.reject(
      new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, response),
    );
  }
  return Promise.resolve(response);
}

const fakeAdapter: AxiosAdapter = (config) => {
  const auth = String(config.headers?.Authorization ?? '');
  requests.push(`${config.url} ${auth}`.trim());
  if (config.url === '/auth/refresh') {
    return respond(config, 200, { accessToken: 'fresh' });
  }
  if (auth !== 'Bearer fresh') {
    return respond(config, 401);
  }
  return respond(config, 204);
};

const originalAdapter = axios.defaults.adapter;

describe('apiClient 401 handling', () => {
  beforeEach(() => {
    requests.length = 0;
    axios.defaults.adapter = fakeAdapter;
  });

  afterEach(() => {
    axios.defaults.adapter = originalAdapter;
  });

  async function loadClient() {
    const module = await import('./client');
    module.setAccessToken('expired');
    return module;
  }

  it('refreshes an expired token and retries authenticated /auth endpoints', async () => {
    const { apiClient } = await loadClient();

    const response = await apiClient.put('/auth/password', {});

    expect(response.status).toBe(204);
    expect(requests).toEqual([
      '/auth/password Bearer expired',
      '/auth/refresh',
      '/auth/password Bearer fresh',
    ]);
  });

  it('does not try to refresh when login itself is rejected', async () => {
    const { apiClient } = await loadClient();

    await expect(apiClient.post('/auth/login', {})).rejects.toBeInstanceOf(AxiosError);
    expect(requests).toEqual(['/auth/login Bearer expired']);
  });
});
