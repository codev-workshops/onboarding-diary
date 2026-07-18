import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, downloadReport, getToken, setToken } from './api';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
  } as Response;
}

describe('token storage', () => {
  it('sets, reads and clears the token', () => {
    expect(getToken()).toBeNull();
    setToken('abc');
    expect(getToken()).toBe('abc');
    setToken(null);
    expect(getToken()).toBeNull();
  });
});

describe('api()', () => {
  it('attaches the bearer token and query params, returning parsed JSON', async () => {
    setToken('tok');
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse([{ id: '1' }]));
    const data = await api<{ id: string }[]>('/tasks', { query: { status: 'Done', skip: '' } });
    expect(data).toEqual([{ id: '1' }]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('/api/tasks?status=Done');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('returns undefined for a 204 response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(undefined, true, 204));
    expect(await api('/mentions/read', { method: 'POST' })).toBeUndefined();
  });

  it('throws an ApiError carrying the server message', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      jsonResponse({ error: { message: 'Nope' } }, false, 403),
    );
    await expect(api('/secret')).rejects.toMatchObject({ status: 403, message: 'Nope' });
    await expect(api('/secret')).rejects.toBeInstanceOf(ApiError);
  });

  it('falls back to a generic message when no server message is present', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({}, false, 500));
    await expect(api('/boom')).rejects.toMatchObject({ message: 'Request failed (500)' });
  });
});

describe('downloadReport()', () => {
  it('fetches the export and triggers a browser download', async () => {
    setToken('tok');
    const blob = new Blob(['data'], { type: 'text/csv' });
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(blob),
    } as Response);
    const createUrl = vi.fn().mockReturnValue('blob:x');
    const revokeUrl = vi.fn();
    URL.createObjectURL = createUrl;
    URL.revokeObjectURL = revokeUrl;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    await downloadReport('csv', { start: '2026-01-01', end: '2026-01-31' });

    expect(createUrl).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledOnce();
    expect(revokeUrl).toHaveBeenCalledWith('blob:x');
  });

  it('throws when the export request fails', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 400 } as Response);
    await expect(downloadReport('pdf', {})).rejects.toBeInstanceOf(ApiError);
  });
});
