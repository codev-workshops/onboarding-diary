export const REFRESH_ATTEMPTS = 5;
export const REFRESH_RETRY_MS = 300;

/**
 * A bounded poll: `refresh` runs immediately and then at most `attempts` times
 * in total, one `intervalMs` apart, after which `onExhausted` runs and nothing
 * further is scheduled. The bound is the whole point — a written entry can
 * legitimately land outside the current page or filter, where no number of
 * refreshes would ever reveal it, and an unbounded retry would then hammer the
 * server for as long as the page stayed open.
 *
 * Returns a cancel function that clears the outstanding timer, so a caller that
 * sees the write land (or unmounts) stops the sequence early.
 */
export function scheduleRefreshes({
  refresh,
  onExhausted,
  attempts = REFRESH_ATTEMPTS,
  intervalMs = REFRESH_RETRY_MS,
}: {
  refresh: () => void;
  onExhausted: () => void;
  attempts?: number;
  intervalMs?: number;
}): () => void {
  let issued = 0;
  let timer: ReturnType<typeof setTimeout>;

  const tick = () => {
    issued += 1;
    refresh();
    timer = issued < attempts ? setTimeout(tick, intervalMs) : setTimeout(onExhausted, intervalMs);
  };

  tick();
  return () => clearTimeout(timer);
}
