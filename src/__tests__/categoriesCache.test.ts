import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getCachedCategories,
  getStaleCategories,
  setCachedCategories,
  invalidateCategoriesCache,
  areCategoriesStale,
  getCategoriesWithStaleness,
} from "@/lib/cache/categoriesCache";
import type { Category } from "@/types";

const mockCategories: Category[] = [
  { id: "cat-1", name: "Chocolates", icon: "🍫" },
  { id: "cat-2", name: "Flowers", icon: "💐" },
  { id: "cat-3", name: "Cakes", icon: "🎂" },
];

describe("categoriesCache", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("setCachedCategories / getCachedCategories", () => {
    it("stores and retrieves categories within 24h TTL", () => {
      setCachedCategories(mockCategories);
      const result = getCachedCategories();
      expect(result).toEqual(mockCategories);
    });

    it("returns null when no categories are cached", () => {
      expect(getCachedCategories()).toBeNull();
    });

    it("returns null when categories are past 24h TTL", () => {
      setCachedCategories(mockCategories);
      const twentyFiveHours = 25 * 60 * 60 * 1000;
      vi.spyOn(Date, "now").mockReturnValue(Date.now() + twentyFiveHours);
      expect(getCachedCategories()).toBeNull();
    });

    it("persists under 'aura_categories' localStorage key", () => {
      setCachedCategories(mockCategories);
      const raw = localStorage.getItem("aura_categories");
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed.data).toEqual(mockCategories);
    });
  });

  describe("getStaleCategories", () => {
    it("returns categories even past TTL", () => {
      setCachedCategories(mockCategories);
      const twentyFiveHours = 25 * 60 * 60 * 1000;
      vi.spyOn(Date, "now").mockReturnValue(Date.now() + twentyFiveHours);
      expect(getCachedCategories()).toBeNull();
      expect(getStaleCategories()).toEqual(mockCategories);
    });

    it("returns null when no cache exists", () => {
      expect(getStaleCategories()).toBeNull();
    });
  });

  describe("invalidateCategoriesCache", () => {
    it("removes cached categories", () => {
      setCachedCategories(mockCategories);
      expect(getCachedCategories()).not.toBeNull();
      invalidateCategoriesCache();
      expect(getCachedCategories()).toBeNull();
    });
  });

  describe("areCategoriesStale", () => {
    it("returns true when no cache exists", () => {
      expect(areCategoriesStale()).toBe(true);
    });

    it("returns false when cache is fresh", () => {
      setCachedCategories(mockCategories);
      expect(areCategoriesStale()).toBe(false);
    });

    it("returns true when cache is past 24h", () => {
      setCachedCategories(mockCategories);
      const twentyFiveHours = 25 * 60 * 60 * 1000;
      vi.spyOn(Date, "now").mockReturnValue(Date.now() + twentyFiveHours);
      expect(areCategoriesStale()).toBe(true);
    });
  });

  describe("getCategoriesWithStaleness (stale-while-revalidate)", () => {
    it("returns fresh data with needsRefresh=false", () => {
      setCachedCategories(mockCategories);
      const result = getCategoriesWithStaleness();
      expect(result.categories).toEqual(mockCategories);
      expect(result.needsRefresh).toBe(false);
    });

    it("returns stale data with needsRefresh=true when past TTL", () => {
      setCachedCategories(mockCategories);
      const twentyFiveHours = 25 * 60 * 60 * 1000;
      vi.spyOn(Date, "now").mockReturnValue(Date.now() + twentyFiveHours);
      const result = getCategoriesWithStaleness();
      expect(result.categories).toEqual(mockCategories);
      expect(result.needsRefresh).toBe(true);
    });

    it("returns null with needsRefresh=true when no cache exists", () => {
      const result = getCategoriesWithStaleness();
      expect(result.categories).toBeNull();
      expect(result.needsRefresh).toBe(true);
    });
  });
});
