import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { ApiError, apiRequest, setAccessToken, setUnauthorizedHandler } from './client';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('apiRequest', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    setAccessToken(null);
    setUnauthorizedHandler(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('prefixes the base URL and parses JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: 1 }));

    await expect(apiRequest<{ id: number }>('/me')).resolves.toEqual({ id: 1 });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/me');
  });

  test('attaches the bearer token when one is set', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));
    setAccessToken('token-123');

    await apiRequest('/me');

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer token-123');
  });

  test('omits the header when there is no token', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    await apiRequest('/departments');

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  test('serialises the body as JSON', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}));

    await apiRequest('/auth/login', { method: 'POST', body: { email: 'a@b.c' } });

    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"email":"a@b.c"}');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  test('returns undefined for 204 responses', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

    await expect(apiRequest('/auth/change-password', { method: 'POST' })).resolves.toBeUndefined();
  });

  test('throws ApiError carrying the ProblemDetails body', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ title: 'Invalid credentials', detail: 'Invalid email or password.' }, 401)
    );

    const error = await apiRequest('/auth/login').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
    expect((error as ApiError).message).toBe('Invalid email or password.');
  });

  test('exposes validation errors with camel-cased field names', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ title: 'Validation failed', errors: { Password: ['Too short.'] } }, 400)
    );

    const error = (await apiRequest('/auth/signup').catch((e: unknown) => e)) as ApiError;

    expect(error.fieldErrors).toEqual({ password: 'Too short.' });
  });

  test('notifies the unauthorized handler on 401', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ title: 'Unauthorized' }, 401));
    const handler = vi.fn();
    setUnauthorizedHandler(handler);

    await apiRequest('/me').catch(() => undefined);

    expect(handler).toHaveBeenCalledOnce();
  });
});
