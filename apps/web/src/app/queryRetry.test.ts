import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../lib/apiClient.js';
import { createQueryClient } from './queryClient.js';

function retryOption() {
  const retry = createQueryClient().getDefaultOptions().queries?.retry;
  if (typeof retry !== 'function') throw new Error('Expected a retry predicate');
  return retry;
}

describe('query defaults', () => {
  it('retries network and 5xx failures but never a 4xx', () => {
    const retry = retryOption();
    const network = new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'offline' });
    const serverError = new ApiError({ status: 503, code: 'SERVICE_UNAVAILABLE', message: 'down' });
    const forbidden = new ApiError({ status: 403, code: 'FORBIDDEN', message: 'no' });

    expect(retry(0, network)).toBe(true);
    expect(retry(0, serverError)).toBe(true);
    expect(retry(0, forbidden)).toBe(false);
    expect(retry(2, network)).toBe(false);
    expect(retry(0, new Error('unexpected'))).toBe(false);
  });

  it('never retries mutations, so a failed write is reported once', () => {
    expect(createQueryClient().getDefaultOptions().mutations?.retry).toBe(false);
  });

  it('does not refetch on window focus, keeping filtered lists stable', () => {
    expect(createQueryClient().getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false);
    expect(vi.isMockFunction(createQueryClient)).toBe(false);
  });
});
