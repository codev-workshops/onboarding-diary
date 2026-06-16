import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getCache,
  setCache,
  invalidateCache,
  isCacheStale,
  getCacheStale,
} from "@/lib/cache/cacheManager";

describe("cacheManager", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("setCache / getCache", () => {
    it("stores and retrieves data within TTL", () => {
      setCache("test-key", { value: 42 });
      const result = getCache<{ value: number }>("test-key", 60_000);
      expect(result).toEqual({ value: 42 });
    });

    it("returns null when key does not exist", () => {
      expect(getCache("missing-key", 60_000)).toBeNull();
    });

    it("returns null when data is expired past TTL", () => {
      setCache("test-key", { value: 1 });
      // Advance time beyond TTL
      vi.spyOn(Date, "now").mockReturnValue(Date.now() + 120_000);
      expect(getCache("test-key", 60_000)).toBeNull();
      vi.restoreAllMocks();
    });

    it("stores string data correctly", () => {
      setCache("str-key", "hello");
      expect(getCache<string>("str-key", 60_000)).toBe("hello");
    });

    it("stores array data correctly", () => {
      setCache("arr-key", [1, 2, 3]);
      expect(getCache<number[]>("arr-key", 60_000)).toEqual([1, 2, 3]);
    });

    it("overwrites existing data for the same key", () => {
      setCache("key", "first");
      setCache("key", "second");
      expect(getCache<string>("key", 60_000)).toBe("second");
    });
  });

  describe("invalidateCache", () => {
    it("removes a cached entry", () => {
      setCache("to-remove", "data");
      expect(getCache("to-remove", 60_000)).toBe("data");
      invalidateCache("to-remove");
      expect(getCache("to-remove", 60_000)).toBeNull();
    });

    it("does not throw when removing a non-existent key", () => {
      expect(() => invalidateCache("nonexistent")).not.toThrow();
    });
  });

  describe("isCacheStale", () => {
    it("returns true when no entry exists", () => {
      expect(isCacheStale("missing", 60_000)).toBe(true);
    });

    it("returns false when entry is within TTL", () => {
      setCache("fresh", "data");
      expect(isCacheStale("fresh", 60_000)).toBe(false);
    });

    it("returns true when entry is past TTL", () => {
      setCache("stale", "data");
      vi.spyOn(Date, "now").mockReturnValue(Date.now() + 120_000);
      expect(isCacheStale("stale", 60_000)).toBe(true);
      vi.restoreAllMocks();
    });
  });

  describe("getCacheStale", () => {
    it("returns null when no entry exists", () => {
      expect(getCacheStale("missing")).toBeNull();
    });

    it("returns data even when past TTL (stale-while-revalidate)", () => {
      setCache("stale-ok", "old-data");
      vi.spyOn(Date, "now").mockReturnValue(Date.now() + 999_999);
      // getCache would return null, but getCacheStale ignores TTL
      expect(getCache("stale-ok", 60_000)).toBeNull();
      expect(getCacheStale<string>("stale-ok")).toBe("old-data");
      vi.restoreAllMocks();
    });
  });

  describe("localStorage JSON structure", () => {
    it("stores entries as {data, timestamp} JSON", () => {
      setCache("structure-test", { foo: "bar" });
      const raw = localStorage.getItem("structure-test");
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!);
      expect(parsed).toHaveProperty("data");
      expect(parsed).toHaveProperty("timestamp");
      expect(parsed.data).toEqual({ foo: "bar" });
      expect(typeof parsed.timestamp).toBe("number");
    });
  });

  describe("corrupted data handling", () => {
    it("returns null for invalid JSON in getCache", () => {
      localStorage.setItem("bad-json", "not-valid-json");
      expect(getCache("bad-json", 60_000)).toBeNull();
    });

    it("returns null for invalid JSON in getCacheStale", () => {
      localStorage.setItem("bad-json2", "{broken");
      expect(getCacheStale("bad-json2")).toBeNull();
    });

    it("returns true for invalid JSON in isCacheStale", () => {
      localStorage.setItem("bad-json3", "xxx");
      expect(isCacheStale("bad-json3", 60_000)).toBe(true);
    });
  });
});
