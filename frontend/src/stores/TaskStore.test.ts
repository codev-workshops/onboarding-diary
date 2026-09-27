import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient, ApiError, type Page, type Task } from "@/lib/apiClient";
import { DEFAULT_TASK_FILTERS, DEFAULT_TASK_SORT, TaskStore, taskErrorMessage } from "@/stores/TaskStore";
import { parseUrlState, serializeUrlState } from "@/hooks/useUrlFilters";

const RECRUIT_ID = "aaaaaaaa-0000-0000-0000-000000000001";

function task(id: string, patch: Partial<Task> = {}): Task {
  return {
    id,
    recruitId: RECRUIT_ID,
    entryDate: "2026-09-20",
    title: `Task ${id}`,
    description: null,
    category: "TRAINING",
    status: "TODO",
    priority: "MEDIUM",
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
  return { code, message, details, timestamp: "2026-01-01T00:00:00Z", path: "/api/v1/tasks" };
}

describe("TaskStore", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let store: TaskStore;

  beforeEach(() => {
    fetchMock = vi.fn();
    const api = new ApiClient("http://api.test", fetchMock as unknown as typeof fetch);
    api.setAuthHandlers({ getToken: () => "jwt", onUnauthorized: () => undefined });
    store = new TaskStore(api);
  });

  const requestUrl = (call: number) => String(fetchMock.mock.calls[call][0]);
  const requestInit = (call: number) => fetchMock.mock.calls[call][1] as RequestInit;

  describe("filters → query string", () => {
    it("sends only page/size/sort when no filters are set", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, page([])));
      await store.load();
      expect(requestUrl(0)).toBe("http://api.test/api/v1/tasks?page=0&size=20&sort=entryDate%2Cdesc");
    });

    it("serializes every filter, the recruit target and pagination", async () => {
      store.setRecruitId(RECRUIT_ID);
      store.setFilters({ category: "SETUP", status: "IN_PROGRESS", from: "2026-09-01", to: "2026-09-30" });
      store.setSort("title,asc");
      store.setPage(2);
      fetchMock.mockResolvedValueOnce(jsonResponse(200, page([])));

      await store.load();

      const url = new URL(requestUrl(0));
      expect(url.pathname).toBe("/api/v1/tasks");
      expect(Object.fromEntries(url.searchParams)).toEqual({
        recruitId: RECRUIT_ID,
        from: "2026-09-01",
        to: "2026-09-30",
        category: "SETUP",
        status: "IN_PROGRESS",
        page: "2",
        size: "20",
        sort: "title,asc",
      });
    });

    it("omits blank filters and resets to the first page when filters change", async () => {
      store.setPage(3);
      store.setFilters({ category: "MEETING", from: "  " });
      expect(store.page).toBe(0);
      expect(store.hasActiveFilters).toBe(true);
      expect(store.query).toMatchObject({ category: "MEETING", status: undefined, from: undefined, to: undefined });

      store.resetFilters();
      expect(store.hasActiveFilters).toBe(false);
      expect(store.filters).toEqual(DEFAULT_TASK_FILTERS);
    });

    it("surfaces list errors with a task-specific message", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(403, errorBody("NOT_ASSIGNED", "nope")));
      await store.load();
      expect(store.list).toBeNull();
      expect(store.listError).toBe(taskErrorMessage(new ApiError(403, "NOT_ASSIGNED", "nope")));
    });
  });

  describe("optimistic list updates", () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, page([task("t1"), task("t2")], 2)));
      await store.load();
    });

    it("create prepends the server entry and bumps totals", async () => {
      const created = task("t3", { title: "Fresh" });
      fetchMock.mockResolvedValueOnce(jsonResponse(201, created));

      const result = await store.create({ entryDate: "2026-09-21", title: "Fresh", category: "TRAINING" });

      expect(result).toEqual(created);
      expect(requestInit(1).method).toBe("POST");
      expect(store.list?.items.map((t) => t.id)).toEqual(["t3", "t1", "t2"]);
      expect(store.list?.totalItems).toBe(3);
      expect(store.current).toEqual(created);
    });

    it("update replaces the entry in place and in `current`", async () => {
      store.current = task("t2");
      const updated = task("t2", { status: "DONE", title: "Done!" });
      fetchMock.mockResolvedValueOnce(jsonResponse(200, updated));

      await store.update("t2", {
        entryDate: "2026-09-20",
        title: "Done!",
        description: null,
        category: "TRAINING",
        status: "DONE",
        priority: "MEDIUM",
      });

      expect(store.list?.items.map((t) => t.id)).toEqual(["t1", "t2"]);
      expect(store.list?.items[1]).toEqual(updated);
      expect(store.current).toEqual(updated);
      expect(store.list?.totalItems).toBe(2);
    });

    it("remove drops the entry immediately and keeps it gone on 204", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(204));
      const pending = store.remove("t1");
      expect(store.list?.items.map((t) => t.id)).toEqual(["t2"]);
      await pending;
      expect(store.list?.totalItems).toBe(1);
      expect(requestInit(1).method).toBe("DELETE");
    });

    it("remove restores the list when the server rejects", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(403, errorBody("FORBIDDEN", "read-only")));
      await expect(store.remove("t1")).rejects.toBeInstanceOf(ApiError);
      expect(store.list?.items.map((t) => t.id)).toEqual(["t1", "t2"]);
      expect(store.list?.totalItems).toBe(2);
      expect(store.mutating).toBe(false);
    });

    it("clear() wipes server-derived state for the next user", () => {
      store.setRecruitId(RECRUIT_ID);
      store.setFilters({ status: "DONE" });
      store.clear();
      expect(store.list).toBeNull();
      expect(store.recruitId).toBeNull();
      expect(store.filters).toEqual(DEFAULT_TASK_FILTERS);
      expect(store.sort).toBe(DEFAULT_TASK_SORT);
    });
  });
});

describe("useUrlFilters helpers", () => {
  const sanitize = (key: string, value: string) => (key === "status" && value === "BOGUS" ? "" : value);

  it("parses filters, 1-based page and sort from the URL", () => {
    const params = new URLSearchParams("category=SETUP&status=BOGUS&page=3&sort=title%2Casc&tab=tasks");
    const state = parseUrlState(params, DEFAULT_TASK_FILTERS, DEFAULT_TASK_SORT, sanitize);
    expect(state.filters).toEqual({ ...DEFAULT_TASK_FILTERS, category: "SETUP" });
    expect(state.page).toBe(2);
    expect(state.sort).toBe("title,asc");
  });

  it("serializes only non-default values and preserves unmanaged keys", () => {
    const qs = serializeUrlState(
      { filters: { ...DEFAULT_TASK_FILTERS, status: "DONE" }, page: 1, sort: DEFAULT_TASK_SORT },
      DEFAULT_TASK_FILTERS,
      DEFAULT_TASK_SORT,
      new URLSearchParams("tab=tasks&page=9&category=OLD"),
    );
    expect(Object.fromEntries(new URLSearchParams(qs))).toEqual({ tab: "tasks", status: "DONE", page: "2" });
  });

  it("round-trips to an empty string for the default state", () => {
    const qs = serializeUrlState({ filters: { ...DEFAULT_TASK_FILTERS }, page: 0, sort: DEFAULT_TASK_SORT }, DEFAULT_TASK_FILTERS, DEFAULT_TASK_SORT);
    expect(qs).toBe("");
  });
});
