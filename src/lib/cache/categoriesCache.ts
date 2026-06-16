/**
 * Categories cache with 24-hour TTL and stale-while-revalidate support.
 * First browse → call MCP, cache response.
 * Subsequent requests → serve from cache instantly.
 * Background refresh if stale.
 */

import {
  getCache,
  setCache,
  invalidateCache,
  isCacheStale,
  getCacheStale,
} from "./cacheManager";
import type { Category } from "@/types";

const STORAGE_KEY = "aura_categories";
const TTL_24H = 24 * 60 * 60 * 1000; // 24 hours in ms

export function getCachedCategories(): Category[] | null {
  return getCache<Category[]>(STORAGE_KEY, TTL_24H);
}

/**
 * Get cached categories even if stale (for stale-while-revalidate).
 * Returns null only if there is no cached data at all.
 */
export function getStaleCategories(): Category[] | null {
  return getCacheStale<Category[]>(STORAGE_KEY);
}

export function setCachedCategories(categories: Category[]): void {
  setCache(STORAGE_KEY, categories);
}

export function invalidateCategoriesCache(): void {
  invalidateCache(STORAGE_KEY);
}

export function areCategoriesStale(): boolean {
  return isCacheStale(STORAGE_KEY, TTL_24H);
}

/**
 * Stale-while-revalidate helper.
 * Returns cached data immediately (even if stale), and indicates
 * whether a background refresh is needed.
 */
export function getCategoriesWithStaleness(): {
  categories: Category[] | null;
  needsRefresh: boolean;
} {
  const fresh = getCachedCategories();
  if (fresh) {
    return { categories: fresh, needsRefresh: false };
  }
  const stale = getStaleCategories();
  if (stale) {
    return { categories: stale, needsRefresh: true };
  }
  return { categories: null, needsRefresh: true };
}
