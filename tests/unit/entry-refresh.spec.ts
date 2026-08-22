import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { REFRESH_ATTEMPTS, REFRESH_RETRY_MS, scheduleRefreshes } from '@/components/entries/refresh';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('scheduleRefreshes', () => {
  it('refreshes immediately rather than waiting out the first interval', () => {
    const refresh = vi.fn();
    scheduleRefreshes({ refresh, onExhausted: vi.fn() });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('stops after the configured number of attempts, however long the page stays open', () => {
    const refresh = vi.fn();
    const onExhausted = vi.fn();

    scheduleRefreshes({ refresh, onExhausted });
    vi.advanceTimersByTime(REFRESH_RETRY_MS * REFRESH_ATTEMPTS * 100);

    expect(refresh).toHaveBeenCalledTimes(REFRESH_ATTEMPTS);
    expect(onExhausted).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('gives up only after the last attempt has had its interval to land', () => {
    const refresh = vi.fn();
    const onExhausted = vi.fn();

    scheduleRefreshes({ refresh, onExhausted, attempts: 3, intervalMs: 100 });

    vi.advanceTimersByTime(250);
    expect(refresh).toHaveBeenCalledTimes(3);
    expect(onExhausted).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(onExhausted).toHaveBeenCalledTimes(1);
  });

  it('cancels the sequence, so a landed write issues no further requests', () => {
    const refresh = vi.fn();
    const onExhausted = vi.fn();

    const cancel = scheduleRefreshes({ refresh, onExhausted });
    vi.advanceTimersByTime(REFRESH_RETRY_MS);
    cancel();
    vi.advanceTimersByTime(REFRESH_RETRY_MS * 100);

    expect(refresh).toHaveBeenCalledTimes(2);
    expect(onExhausted).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
