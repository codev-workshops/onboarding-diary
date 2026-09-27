import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient, ApiError, type Note, type Page } from "@/lib/apiClient";
import { DEFAULT_NOTE_FILTERS, NoteStore, isValidTag, noteErrorMessage, normalizeTag } from "@/stores/NoteStore";
import { normalizeTags, tagError, validateNote, toCreateRequest } from "@/features/notes/noteForm";

const RECRUIT_ID = "aaaaaaaa-0000-0000-0000-000000000001";

function note(id: string, patch: Partial<Note> = {}): Note {
  return {
    id,
    recruitId: RECRUIT_ID,
    entryDate: "2026-09-20",
    title: `Note ${id}`,
    content: "Some content",
    tags: [],
    version: 1,
    createdAt: "2026-09-20T10:00:00Z",
    updatedAt: "2026-09-20T10:00:00Z",
    ...patch,
  };
}

function page<T>(items: T[], totalItems = items.length, size = 20): Page<T> {
  return { items, page: 0, size, totalItems, totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / size) };
}

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
  });
}

function errorBody(code: string, message: string, details: unknown[] = []) {
  return { code, message, details, timestamp: "2026-01-01T00:00:00Z", path: "/api/v1/notes" };
}

describe("tag helpers", () => {
  it("normalizeTag trims and lowercases", () => {
    expect(normalizeTag("  Kotlin ")).toBe("kotlin");
  });

  it("normalizeTags mirrors the backend: trim, lowercase, drop blanks, dedupe in order", () => {
    expect(normalizeTags(["Kotlin", " setup ", "kotlin", "", "  ", "SETUP", "ci-cd"])).toEqual(["kotlin", "setup", "ci-cd"]);
  });

  it("isValidTag enforces ^[a-z0-9][a-z0-9-]{0,29}$", () => {
    expect(isValidTag("kotlin")).toBe(true);
    expect(isValidTag("a")).toBe(true);
    expect(isValidTag("k8s-cluster")).toBe(true);
    expect(isValidTag("a".repeat(30))).toBe(true);
    expect(isValidTag("a".repeat(31))).toBe(false);
    expect(isValidTag("-leading")).toBe(false);
    expect(isValidTag("has space")).toBe(false);
    expect(isValidTag("Upper")).toBe(false);
    expect(isValidTag("under_score")).toBe(false);
    expect(isValidTag("")).toBe(false);
  });

  it("tagError explains why a draft is rejected", () => {
    expect(tagError("  ")).toMatch(/empty/);
    expect(tagError("a".repeat(31))).toMatch(/30 characters/);
    expect(tagError("bad tag!")).toMatch(/lowercase letters/);
    expect(tagError(" Kotlin ")).toBeNull();
  });

  it("validateNote rejects more than 10 distinct tags but not duplicates collapsing under the limit", () => {
    const base = { entryDate: "2026-09-20", title: "t", content: "c" };
    const eleven = Array.from({ length: 11 }, (_, i) => `tag-${i}`);
    expect(validateNote({ ...base, tags: eleven }).tags).toMatch(/At most 10/);
    const dupes = [...Array.from({ length: 10 }, (_, i) => `tag-${i}`), "TAG-0", " tag-1 "];
    expect(validateNote({ ...base, tags: dupes }).tags).toBeUndefined();
    expect(validateNote({ ...base, tags: ["ok", "not ok"] }).tags).toMatch(/not a valid tag/);
  });

  it("toCreateRequest sends normalized tags", () => {
    expect(toCreateRequest({ entryDate: "2026-09-20", title: " T ", content: " C ", tags: ["Kotlin", " setup "] })).toEqual({
      entryDate: "2026-09-20",
      title: "T",
      content: "C",
      tags: ["kotlin", "setup"],
    });
  });
});

describe("NoteStore", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let store: NoteStore;

  beforeEach(() => {
    fetchMock = vi.fn();
    const api = new ApiClient("http://api.test", fetchMock as unknown as typeof fetch);
    api.setAuthHandlers({ getToken: () => "jwt", onUnauthorized: () => undefined });
    store = new NoteStore(api);
  });

  const requestUrl = (call: number) => String(fetchMock.mock.calls[call][0]);
  const requestInit = (call: number) => fetchMock.mock.calls[call][1] as RequestInit;

  describe("filters → query string", () => {
    it("sends only page/size/sort when no filters are set", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, page([])));
      await store.load();
      expect(requestUrl(0)).toBe("http://api.test/api/v1/notes?page=0&size=20&sort=entryDate%2Cdesc");
    });

    it("serializes dates, the normalized tag, the recruit target and pagination", async () => {
      store.setRecruitId(RECRUIT_ID);
      store.setFilters({ from: "2026-09-01", to: "2026-09-30", tag: " Kotlin " });
      store.setSort("title,asc");
      store.setPage(2);
      fetchMock.mockResolvedValueOnce(jsonResponse(200, page([])));

      await store.load();

      const url = new URL(requestUrl(0));
      expect(url.pathname).toBe("/api/v1/notes");
      expect(Object.fromEntries(url.searchParams)).toEqual({
        recruitId: RECRUIT_ID,
        from: "2026-09-01",
        to: "2026-09-30",
        tag: "kotlin",
        page: "2",
        size: "20",
        sort: "title,asc",
      });
    });

    it("omits a blank tag filter from the query and resets paging when filters change", () => {
      store.setPage(3);
      store.setFilters({ tag: "  " });
      expect(store.page).toBe(0);
      expect(store.query.tag).toBeUndefined();

      store.setFilters({ tag: "setup" });
      expect(store.hasActiveFilters).toBe(true);
      expect(store.query.tag).toBe("setup");
      store.resetFilters();
      expect(store.hasActiveFilters).toBe(false);
      expect(store.filters).toEqual(DEFAULT_NOTE_FILTERS);
    });

    it("surfaces list errors with a note-specific message", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(403, errorBody("NOT_ASSIGNED", "nope")));
      await store.load();
      expect(store.list).toBeNull();
      expect(store.listError).toBe("You are not assigned to this recruit.");
    });
  });

  describe("optimistic list updates", () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, page([note("n1", { tags: ["kotlin"] }), note("n2")], 2)));
      await store.load();
    });

    it("create prepends the server note (with normalized tags) and bumps totals", async () => {
      const created = note("n3", { tags: ["kotlin", "setup"] });
      fetchMock.mockResolvedValueOnce(jsonResponse(201, created));

      const result = await store.create({ entryDate: "2026-09-21", title: "Fresh", content: "x", tags: ["Kotlin", " setup "] });

      expect(result).toEqual(created);
      expect(requestInit(1).method).toBe("POST");
      expect(JSON.parse(String(requestInit(1).body)).tags).toEqual(["Kotlin", " setup "]);
      expect(store.list?.items.map((n) => n.id)).toEqual(["n3", "n1", "n2"]);
      expect(store.list?.totalItems).toBe(3);
      expect(store.current).toEqual(created);
    });

    it("create does not insert a note that does not carry the active tag filter", async () => {
      store.setFilters({ tag: "kotlin" });
      fetchMock.mockResolvedValueOnce(jsonResponse(200, page([note("n1", { tags: ["kotlin"] })], 1)));
      await store.load();
      fetchMock.mockResolvedValueOnce(jsonResponse(201, note("n3", { tags: ["setup"] })));

      await store.create({ entryDate: "2026-09-21", title: "Other", content: "x", tags: ["setup"] });

      expect(store.list).toBeNull();
      expect(store.current?.id).toBe("n3");
    });

    it("update replaces the note (and its tag set) in place and sends If-Match", async () => {
      store.current = note("n2");
      const updated = note("n2", { tags: ["docs"], version: 2 });
      fetchMock.mockResolvedValueOnce(jsonResponse(200, updated));

      await store.update("n2", { entryDate: "2026-09-20", title: "Note n2", content: "x", tags: ["docs"] }, '"1"');

      expect((requestInit(1).headers as Record<string, string>)["If-Match"]).toBe('"1"');
      expect(store.list?.items[1]).toEqual(updated);
      expect(store.current).toEqual(updated);
    });

    it("update drops a note that no longer matches the active tag filter", async () => {
      store.setFilters({ tag: "kotlin" });
      fetchMock.mockResolvedValueOnce(jsonResponse(200, page([note("n1", { tags: ["kotlin"] })], 1)));
      await store.load();
      fetchMock.mockResolvedValueOnce(jsonResponse(200, note("n1", { tags: ["setup"], version: 2 })));

      await store.update("n1", { entryDate: "2026-09-20", title: "x", content: "y", tags: ["setup"] });

      expect(store.list?.items).toEqual([]);
      expect(store.list?.totalItems).toBe(0);
    });

    it("remove deletes from the list and clears current", async () => {
      store.current = note("n1");
      fetchMock.mockResolvedValueOnce(jsonResponse(204));

      await store.remove("n1");

      expect(requestInit(1).method).toBe("DELETE");
      expect(store.list?.items.map((n) => n.id)).toEqual(["n2"]);
      expect(store.list?.totalItems).toBe(1);
      expect(store.current).toBeNull();
    });
  });

  describe("errors", () => {
    it("loadOne maps a foreign / missing note to the NOT_FOUND message", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(404, errorBody("NOT_FOUND", "Note not found")));
      await store.loadOne("nope");
      expect(store.current).toBeNull();
      expect(store.currentError).toBe("This note does not exist or you cannot access it.");
    });

    it("create rethrows VALIDATION_FAILED so the form can map field details", async () => {
      fetchMock.mockResolvedValueOnce(
        jsonResponse(400, errorBody("VALIDATION_FAILED", "Validation failed", [{ field: "tags", message: "must not exceed 10 tags" }])),
      );
      await expect(store.create({ entryDate: "2026-09-21", title: "t", content: "c", tags: [] })).rejects.toBeInstanceOf(ApiError);
      expect(store.mutating).toBe(false);
    });

    it("noteErrorMessage covers the catalog", () => {
      expect(noteErrorMessage(new ApiError(409, "CONFLICT", "stale"))).toMatch(/changed by someone else/);
      expect(noteErrorMessage(new ApiError(403, "FORBIDDEN", "no"))).toBe("You are not allowed to do that.");
      expect(noteErrorMessage(new Error("boom"))).toBe("boom");
      expect(noteErrorMessage("?")).toBe("Something went wrong");
    });
  });
});
