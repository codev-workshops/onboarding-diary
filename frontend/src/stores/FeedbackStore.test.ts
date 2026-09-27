import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient, type Feedback, type Page } from "@/lib/apiClient";
import { FeedbackStore, feedbackErrorMessage } from "@/stores/FeedbackStore";
import { ApiError } from "@/lib/apiClient";
import { feedbackFields, toCreateRequest, validateFeedback } from "@/features/feedback/feedbackForm";
import { todayUtc } from "@/features/tasks/taskForm";

const RECRUIT_ID = "aaaaaaaa-0000-0000-0000-000000000001";

function note(id: string, patch: Partial<Feedback> = {}): Feedback {
  return {
    id,
    recruitId: RECRUIT_ID,
    entryDate: "2026-09-20",
    subject: `Note ${id}`,
    type: "SUGGESTION",
    details: "Some details",
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

function errorBody(code: string, message: string) {
  return { code, message, details: [], timestamp: "2026-01-01T00:00:00Z", path: "/api/v1/feedback" };
}

describe("FeedbackStore", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let store: FeedbackStore;

  beforeEach(() => {
    fetchMock = vi.fn();
    const api = new ApiClient("http://api.test", fetchMock as unknown as typeof fetch);
    api.setAuthHandlers({ getToken: () => "jwt", onUnauthorized: () => undefined });
    store = new FeedbackStore(api);
  });

  const requestUrl = (call: number) => String(fetchMock.mock.calls[call][0]);
  const requestInit = (call: number) => fetchMock.mock.calls[call][1] as RequestInit;

  it("maps filters (type, from, to, recruitId) onto the query string", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, page([])));
    store.setRecruitId(RECRUIT_ID);
    store.setFilters({ from: "2026-09-01", to: "2026-09-30", type: "CONCERN" });
    await store.load();
    const url = new URL(requestUrl(0));
    expect(url.pathname).toBe("/api/v1/feedback");
    expect(url.searchParams.get("recruitId")).toBe(RECRUIT_ID);
    expect(url.searchParams.get("from")).toBe("2026-09-01");
    expect(url.searchParams.get("to")).toBe("2026-09-30");
    expect(url.searchParams.get("type")).toBe("CONCERN");
    expect(url.searchParams.get("sort")).toBe("entryDate,desc");
  });

  it("only inserts an optimistic create when it matches the active type filter", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, page([note("a", { type: "CONCERN" })])));
    store.setFilters({ from: "", to: "", type: "CONCERN" });
    await store.load();
    fetchMock.mockResolvedValueOnce(jsonResponse(201, note("b", { type: "POSITIVE" })));
    await store.create(toCreateRequest({ entryDate: "2026-09-20", subject: "b", type: "POSITIVE", details: "d" }));
    expect(store.currentList).toBeNull();
  });

  it("forwards the ETag as If-Match on update", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, note("a", { version: 3 })));
    await store.update("a", toCreateRequest({ entryDate: "2026-09-20", subject: "s", type: "POSITIVE", details: "d" }), '"2"');
    expect(new Headers(requestInit(0).headers).get("If-Match")).toBe('"2"');
  });

  describe("probeVisibility (D3 recruit tab gate)", () => {
    it("is unknown before probing, true on 200, false on 403 NOT_ASSIGNED", async () => {
      expect(store.isVisible(RECRUIT_ID)).toBeNull();
      fetchMock.mockResolvedValueOnce(jsonResponse(200, page([])));
      expect(await store.probeVisibility(RECRUIT_ID)).toBe(true);
      expect(store.isVisible(RECRUIT_ID)).toBe(true);
      expect(new URL(requestUrl(0)).searchParams.get("size")).toBe("1");

      const other = "bbbbbbbb-0000-0000-0000-000000000002";
      fetchMock.mockResolvedValueOnce(jsonResponse(403, errorBody("NOT_ASSIGNED", "not assigned")));
      expect(await store.probeVisibility(other)).toBe(false);
      expect(store.isVisible(other)).toBe(false);
    });

    it("leaves visibility unknown on transient failures and forgets it on clear()", async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse(500, errorBody("INTERNAL_ERROR", "boom")));
      expect(await store.probeVisibility(RECRUIT_ID)).toBeNull();
      expect(store.isVisible(RECRUIT_ID)).toBeNull();
      fetchMock.mockResolvedValueOnce(jsonResponse(200, page([])));
      await store.probeVisibility(RECRUIT_ID);
      store.clear();
      expect(store.isVisible(RECRUIT_ID)).toBeNull();
    });
  });

  it("translates the error catalog", () => {
    expect(feedbackErrorMessage(new ApiError(404, "NOT_FOUND", "x", []))).toMatch(/does not exist or you cannot access/);
    expect(feedbackErrorMessage(new ApiError(403, "NOT_ASSIGNED", "x", []))).toMatch(/not assigned/);
    expect(feedbackErrorMessage(new ApiError(409, "CONFLICT", "x", []))).toMatch(/changed by someone else/);
  });
});

describe("validateFeedback", () => {
  const valid = { entryDate: todayUtc(), subject: "Great mentor", type: "POSITIVE", details: "Weekly 1:1s are helpful." };

  it("accepts a valid form and exposes the four fields", () => {
    expect(validateFeedback(valid)).toEqual({});
    expect(feedbackFields().map((f) => f.key)).toEqual(["subject", "entryDate", "type", "details"]);
  });

  it("flags required fields, length limits and future dates", () => {
    expect(validateFeedback({ ...valid, subject: " ", type: "", details: "", entryDate: "" })).toEqual({
      subject: "Subject is required.",
      type: "Type is required.",
      details: "Details are required.",
      entryDate: "Date is required.",
    });
    const errors = validateFeedback({ ...valid, subject: "x".repeat(201), details: "y".repeat(4001), entryDate: "2999-01-01" });
    expect(errors.subject).toMatch(/200/);
    expect(errors.details).toMatch(/4000/);
    expect(errors.entryDate).toBe("Date cannot be in the future.");
  });
});
