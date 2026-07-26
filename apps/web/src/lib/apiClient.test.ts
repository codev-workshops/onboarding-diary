import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError, createApiClient, createMemoryTokenStore } from './apiClient.js';

const BASE = 'http://api.test/api/v1';

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function build(fetchFn: typeof fetch, onSessionExpired = vi.fn()) {
  const tokens = createMemoryTokenStore('access-1');
  const client = createApiClient({ baseUrl: BASE, tokens, onSessionExpired, fetchFn });
  return { client, tokens, onSessionExpired };
}

describe('createApiClient', () => {
  beforeEach(() => vi.clearAllMocks());

  it('attaches the bearer token and serialises repeated query values', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse(200, { data: [] }));
    const { client } = build(fetchFn as unknown as typeof fetch);

    await client.get('/notes', { query: { tag: ['setup', 'vpn'], page: 2, q: '', status: null } });

    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE}/notes?tag=setup&tag=vpn&page=2`);
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer access-1');
    expect(init.credentials).toBe('include');
  });

  it('maps a 422 envelope onto ApiError.fieldErrors', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse(422, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: [{ field: 'title', message: 'Title is required' }],
          requestId: 'req-1',
        },
      }),
    );
    const { client } = build(fetchFn as unknown as typeof fetch);

    const error = await client.post('/tasks', {}).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.status).toBe(422);
    expect(apiError.code).toBe('VALIDATION_ERROR');
    expect(apiError.requestId).toBe('req-1');
    expect(apiError.fieldErrors).toEqual({ title: 'Title is required' });
  });

  it('refreshes once on 401 and retries the original request with the new token', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHENTICATED' } }))
      .mockResolvedValueOnce(jsonResponse(200, { data: { accessToken: 'access-2' } }))
      .mockResolvedValueOnce(jsonResponse(200, { data: { id: 'task-1' } }));
    const { client, tokens, onSessionExpired } = build(fetchFn as unknown as typeof fetch);

    const result = await client.get<{ data: { id: string } }>('/tasks/task-1');

    expect(result.data.id).toBe('task-1');
    expect(fetchFn.mock.calls.map((call) => call[0])).toEqual([
      `${BASE}/tasks/task-1`,
      `${BASE}/auth/refresh`,
      `${BASE}/tasks/task-1`,
    ]);
    const retryHeaders = (fetchFn.mock.calls[2]?.[1] as RequestInit).headers as Record<
      string,
      string
    >;
    expect(retryHeaders['Authorization']).toBe('Bearer access-2');
    expect(tokens.get()).toBe('access-2');
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('does not refresh twice: a 401 after the retry surfaces to the caller', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHENTICATED' } }))
      .mockResolvedValueOnce(jsonResponse(200, { data: { accessToken: 'access-2' } }))
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHENTICATED' } }));
    const { client } = build(fetchFn as unknown as typeof fetch);

    await expect(client.get('/tasks')).rejects.toBeInstanceOf(ApiError);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('clears the token and reports an expired session when the refresh fails', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHENTICATED' } }))
      .mockResolvedValueOnce(jsonResponse(401, { error: { code: 'UNAUTHENTICATED' } }));
    const { client, tokens, onSessionExpired } = build(fetchFn as unknown as typeof fetch);

    await expect(client.get('/tasks')).rejects.toBeInstanceOf(ApiError);
    expect(tokens.get()).toBeNull();
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('turns a fetch rejection into a NETWORK_ERROR and a 204 into undefined', async () => {
    const offline = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const { client: offlineClient } = build(offline as unknown as typeof fetch);
    const error = (await offlineClient
      .get('/tasks')
      .catch((caught: unknown) => caught)) as ApiError;
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.status).toBe(0);

    const noContent = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const { client } = build(noContent as unknown as typeof fetch);
    await expect(client.del('/tasks/task-1')).resolves.toBeUndefined();
  });
});
