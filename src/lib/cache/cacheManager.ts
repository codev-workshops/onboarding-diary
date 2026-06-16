/**
 * Generic localStorage cache utility with TTL support.
 * Provides get/set/invalidate operations and stale-while-revalidate pattern.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Retrieve cached data if it exists and is within the specified TTL.
 * Returns null if missing or expired.
 */
export function getCache<T>(key: string, ttl: number): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > ttl) return null;
    return entry.data;
  } catch {
    return null;
  }
}

/**
 * Store data in localStorage with the current timestamp.
 */
export function setCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

/**
 * Remove a cached entry from localStorage.
 */
export function invalidateCache(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

/**
 * Check whether a cached entry exists but is stale (past TTL).
 * Useful for stale-while-revalidate: serve stale data immediately,
 * then refresh in the background.
 */
export function isCacheStale(key: string, ttl: number): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return true;
    const entry: CacheEntry<unknown> = JSON.parse(raw);
    return Date.now() - entry.timestamp > ttl;
  } catch {
    return true;
  }
}

/**
 * Retrieve cached data even if stale (ignores TTL).
 * Returns null only if no cached entry exists at all.
 */
export function getCacheStale<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    return entry.data;
  } catch {
    return null;
  }
}
