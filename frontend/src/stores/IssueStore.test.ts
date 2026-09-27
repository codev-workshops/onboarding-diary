import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient, ApiError, type Page, type Issue } from "@/lib/apiClient";
import { DEFAULT_ISSUE_FILTERS, DEFAULT_ISSUE_SORT, IssueStore, issueErrorMessage } from "@/stores/IssueStore";
import { isIsoDate, parseUrlState, serializeUrlState } from "@/hooks/useUrlFilters";

const RECRUIT_ID = "aaaaaaaa-0000-0000-0000-000000000001";

function issue(id: string, patch: Partial<Issue> = {}): Issue {
  return {
    id,
    recruitId: RECRUIT_ID,
    entryDate: "2026-09-20",
    title: `Issue ${id}`,
    description: null,
    severity: "HIGH",
    status: "OPEN",
    resolutionNotes: null,
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
  return { code, message, details, timestamp: "2026-01-01T00:00:00Z", path: "/api/v1/issues" };
}

describe("IssueStore", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let store: IssueStore;

  beforeEach(() => {
    fetchMock = vi.fn();
    const api = new ApiClient("http://api.test", fetchMock as unknown as typeof fetch);
    api.setAuthHandlers({ getToken: () => "jwt", onUnauthorized: () => undefined });
    store = new IssueStore(api);
  });

  const requestUrl = (call: number) => String(fetchMock.mock.calls[call][0]);
  const requestInit = (call: number) => fetchMock.mock.calls[call][1] as RequestInit;

  describe("filters → query string", () => {
    it("sends only page/size/sort when no filters are set", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, page([])));
      await store.load();
      expect(requestUrl(0)).toBe("http://api.test/api/v1/issues?page=0&size=20&sort=entryDate%2Cdesc");
    });

    it("serializes every filter, the recruit target and pagination", async () => {
      store.setRecruitId(RECRUIT_ID);
      store.setFilters({ severity: "CRITICAL", status: "IN_PROGRESS", from: "2026-09-01", to: "2026-09-30" });
      store.setSort("title,asc");
      store.setPage(2);
      fetchMock.mockResolvedValueOnce(jsonResponse(200, page([])));

      await store.load();

      const url = new URL(requestUrl(0));
      expect(url.pathname).toBe("/api/v1/issues");
      expect(Object.fromEntries(url.searchParams)).toEqual({
        recruitId: RECRUIT_ID,
        from: "2026-09-01",
        to: "2026-09-30",
        severity: "CRITICAL",
        status: "IN_PROGRESS",
        page: "2",
        size: "20",
        sort: "title,asc",
      });
    });

    it("omits blank filters and resets to the first page when filters change", async () => {
      store.setPage(3);
      store.setFilters({ severity: "LOW", from: "  " });
      expect(store.page).toBe(0);
      expect(store.hasActiveFilters).toBe(true);
      expect(store.query).toMatchObject({ severity: "LOW", status: undefined, from: undefined, to: undefined });

      store.resetFilters();
      expect(store.hasActiveFilters).toBe(false);
      expect(store.filters).toEqual(DEFAULT_ISSUE_FILTERS);
    });

    it("surfaces list errors with a issue-specific message", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(403, errorBody("NOT_ASSIGNED", "nope")));
      await store.load();
      expect(store.list).toBeNull();
      expect(store.listError).toBe(issueErrorMessage(new ApiError(403, "NOT_ASSIGNED", "nope")));
    });
  });

  describe("optimistic list updates", () => {
    beforeEach(async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, page([issue("t1"), issue("t2")], 2)));
      await store.load();
    });

    it("create prepends the server entry and bumps totals", async () => {
      const created = issue("t3", { title: "Fresh" });
      fetchMock.mockResolvedValueOnce(jsonResponse(201, created));

      const result = await store.create({ entryDate: "2026-09-21", title: "Fresh", severity: "HIGH" });

      expect(result).toEqual(created);
      expect(requestInit(1).method).toBe("POST");
      expect(store.list?.items.map((t) => t.id)).toEqual(["t3", "t1", "t2"]);
      expect(store.list?.totalItems).toBe(3);
      expect(store.current).toEqual(created);
    });

    it("create does not insert an entry that falls outside the active filters", async () => {
      store.setFilters({ status: "RESOLVED" });
      fetchMock.mockResolvedValueOnce(jsonResponse(200, page([issue("d1", { status: "RESOLVED" })], 1)));
      await store.load();
      fetchMock.mockResolvedValueOnce(jsonResponse(201, issue("t3")));

      await store.create({ entryDate: "2026-09-21", title: "Open", severity: "HIGH" });

      expect(store.list).toBeNull();
      expect(store.current?.id).toBe("t3");
    });

    it("create drops the list instead of prepending an entry that would break the sort order", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(201, issue("old", { entryDate: "2026-09-01" })));
      await store.create({ entryDate: "2026-09-01", title: "Older", severity: "HIGH" });
      expect(store.list).toBeNull();
      expect(store.current?.id).toBe("old");
    });

    it("create never patches a list loaded under a non-default sort", async () => {
      store.setSort("title,asc");
      fetchMock.mockResolvedValueOnce(jsonResponse(200, page([issue("a", { title: "A" }), issue("c", { title: "C" })], 2)));
      await store.load();
      fetchMock.mockResolvedValueOnce(jsonResponse(201, issue("b", { title: "B" })));

      await store.create({ entryDate: "2026-09-20", title: "B", severity: "HIGH" });

      expect(store.list).toBeNull();
    });

    it("create keeps the first page within its size", async () => {
      store.size = 2;
      fetchMock.mockResolvedValueOnce(jsonResponse(200, page([issue("t1"), issue("t2")], 5, 2)));
      await store.load();
      fetchMock.mockResolvedValueOnce(jsonResponse(201, issue("t3")));

      await store.create({ entryDate: "2026-09-21", title: "Fresh", severity: "HIGH" });

      expect(store.list?.items.map((t) => t.id)).toEqual(["t3", "t1"]);
      expect(store.list?.totalItems).toBe(6);
      expect(store.list?.totalPages).toBe(3);
    });

    it("update replaces the entry in place and in `current`", async () => {
      store.current = issue("t2");
      const updated = issue("t2", { status: "RESOLVED", title: "Resolved!" });
      fetchMock.mockResolvedValueOnce(jsonResponse(200, updated));

      await store.update("t2", {
        entryDate: "2026-09-20",
        title: "Resolved!",
        description: null,
        severity: "HIGH",
        status: "RESOLVED",
        resolutionNotes: null,
      });

      expect(store.list?.items.map((t) => t.id)).toEqual(["t1", "t2"]);
      expect(store.list?.items[1]).toEqual(updated);
      expect(store.current).toEqual(updated);
      expect(store.list?.totalItems).toBe(2);
    });

    it("update sends If-Match when given the entry's ETag", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, issue("t2", { version: 2 })));
      await store.update("t2", { entryDate: "2026-09-20", title: "x", severity: "HIGH", status: "OPEN" }, '"1"');
      expect((requestInit(1).headers as Record<string, string>)["If-Match"]).toBe('"1"');
      expect(store.list?.items[1]?.version).toBe(2);
    });

    it("update removes an entry that no longer matches the active filters", async () => {
      store.setFilters({ status: "OPEN" });
      fetchMock.mockResolvedValueOnce(jsonResponse(200, page([issue("t1"), issue("t2")], 2)));
      await store.load();
      fetchMock.mockResolvedValueOnce(jsonResponse(200, issue("t2", { status: "RESOLVED" })));

      await store.update("t2", { entryDate: "2026-09-20", title: "x", severity: "HIGH", status: "RESOLVED" });

      expect(store.list?.items.map((t) => t.id)).toEqual(["t1"]);
      expect(store.list?.totalItems).toBe(1);
    });

    it("update drops the list when the entry's sort position may have moved", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, issue("t2", { entryDate: "2026-09-25" })));
      await store.update("t2", { entryDate: "2026-09-25", title: "x", severity: "HIGH", status: "OPEN" });
      expect(store.list).toBeNull();
    });

    it("currentList hides a page loaded for a previous query", () => {
      expect(store.currentList?.items).toHaveLength(2);
      store.setFilters({ status: "RESOLVED" });
      expect(store.list).not.toBeNull();
      expect(store.currentList).toBeNull();
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

    it("a delete that fails after the filters changed does not restore the old query's page", async () => {
      let reject: (e: unknown) => void = () => undefined;
      fetchMock.mockReturnValueOnce(new Promise((_, r) => (reject = r)));
      const pending = store.remove("t1");
      store.setFilters({ status: "RESOLVED" });
      fetchMock.mockResolvedValueOnce(jsonResponse(200, page([issue("d1", { status: "RESOLVED" })], 1)));
      await store.load();
      reject(new ApiError(403, "FORBIDDEN", "read-only"));
      await expect(pending).rejects.toBeInstanceOf(ApiError);
      expect(store.list?.items.map((t) => t.id)).toEqual(["d1"]);
      expect(store.mutating).toBe(false);
    });

    it("a delete that fails after clear() does not restore the previous user's list", async () => {
      let reject: (e: unknown) => void = () => undefined;
      fetchMock.mockReturnValueOnce(new Promise((_, r) => (reject = r)));
      const pending = store.remove("t1");
      store.clear();
      reject(new Error("network"));
      await expect(pending).rejects.toThrow("network");
      expect(store.list).toBeNull();
      expect(store.mutating).toBe(false);
    });

    it("a create that resolves after clear() does not repopulate the store", async () => {
      let resolve: (r: Response) => void = () => undefined;
      fetchMock.mockReturnValueOnce(new Promise((r) => (resolve = r)));
      const pending = store.create({ entryDate: "2026-09-21", title: "Late", severity: "HIGH" });
      store.clear();
      resolve(jsonResponse(201, issue("late")));
      await pending;
      expect(store.list).toBeNull();
      expect(store.current).toBeNull();
    });

    it("clear() wipes server-derived state for the next user", () => {
      store.setRecruitId(RECRUIT_ID);
      store.setFilters({ status: "RESOLVED" });
      store.clear();
      expect(store.list).toBeNull();
      expect(store.recruitId).toBeNull();
      expect(store.filters).toEqual(DEFAULT_ISSUE_FILTERS);
      expect(store.sort).toBe(DEFAULT_ISSUE_SORT);
    });
  });
});

describe("out-of-range pages", () => {
  it("load re-requests the last page when the URL page is past the end", async () => {
    const fetchMock = vi.fn();
    const api = new ApiClient("http://api.test", fetchMock as unknown as typeof fetch);
    api.setAuthHandlers({ getToken: () => "jwt", onUnauthorized: () => undefined });
    const store = new IssueStore(api);
    store.setPage(998);
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { items: [], page: 998, size: 20, totalItems: 25, totalPages: 2 }));
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { items: [issue("t21")], page: 1, size: 20, totalItems: 25, totalPages: 2 }));

    await store.load();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new URL(String(fetchMock.mock.calls[1][0])).searchParams.get("page")).toBe("1");
    expect(store.page).toBe(1);
    expect(store.list?.items.map((t) => t.id)).toEqual(["t21"]);
    expect(store.listLoading).toBe(false);
  });
});

describe("issueErrorMessage", () => {
  it("explains INV-07 and invalid transitions in user terms", () => {
    expect(issueErrorMessage(new ApiError(422, "RESOLUTION_NOTES_REQUIRED", "x"))).toMatch(/Resolution notes are required/);
    expect(
      issueErrorMessage(
        new ApiError(422, "INVALID_STATE_TRANSITION", "x", [{ field: "status", code: "INVALID_TRANSITION", message: "cannot move from OPEN to CLOSED" }]),
      ),
    ).toBe("Status cannot move from OPEN to CLOSED.");
    expect(issueErrorMessage(new ApiError(404, "NOT_FOUND", "x"))).toMatch(/does not exist/);
  });
});

describe("useUrlFilters helpers", () => {
  const sanitize = (key: string, value: string) => (key === "status" && value === "BOGUS" ? "" : value);

  it("falls back to the default sort for values outside the whitelist", () => {
    const allowed = ["entryDate,desc", "title,asc"];
    expect(parseUrlState(new URLSearchParams("sort=unknown%2Casc"), DEFAULT_ISSUE_FILTERS, DEFAULT_ISSUE_SORT, undefined, allowed).sort).toBe(DEFAULT_ISSUE_SORT);
    expect(parseUrlState(new URLSearchParams("sort=title%2Casc"), DEFAULT_ISSUE_FILTERS, DEFAULT_ISSUE_SORT, undefined, allowed).sort).toBe("title,asc");
  });

  it("isIsoDate rejects impossible calendar dates", () => {
    expect(isIsoDate("2026-09-27")).toBe(true);
    expect(isIsoDate("2024-02-29")).toBe(true);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-9-1")).toBe(false);
  });

  it("parses filters, 1-based page and sort from the URL", () => {
    const params = new URLSearchParams("severity=CRITICAL&status=BOGUS&page=3&sort=title%2Casc&tab=issues");
    const state = parseUrlState(params, DEFAULT_ISSUE_FILTERS, DEFAULT_ISSUE_SORT, sanitize);
    expect(state.filters).toEqual({ ...DEFAULT_ISSUE_FILTERS, severity: "CRITICAL" });
    expect(state.page).toBe(2);
    expect(state.sort).toBe("title,asc");
  });

  it("serializes only non-default values and preserves unmanaged keys", () => {
    const qs = serializeUrlState(
      { filters: { ...DEFAULT_ISSUE_FILTERS, status: "RESOLVED" }, page: 1, sort: DEFAULT_ISSUE_SORT },
      DEFAULT_ISSUE_FILTERS,
      DEFAULT_ISSUE_SORT,
      new URLSearchParams("tab=issues&page=9&severity=OLD"),
    );
    expect(Object.fromEntries(new URLSearchParams(qs))).toEqual({ tab: "issues", status: "RESOLVED", page: "2" });
  });

  it("round-trips to an empty string for the default state", () => {
    const qs = serializeUrlState({ filters: { ...DEFAULT_ISSUE_FILTERS }, page: 0, sort: DEFAULT_ISSUE_SORT }, DEFAULT_ISSUE_FILTERS, DEFAULT_ISSUE_SORT);
    expect(qs).toBe("");
  });
});
