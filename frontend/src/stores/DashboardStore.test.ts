import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient, type DashboardSummary, type Issue } from "@/lib/apiClient";
import { DashboardStore, entryHref, toDashboardView } from "@/stores/DashboardStore";

const RECRUIT_ID = "aaaaaaaa-0000-0000-0000-000000000001";

const issue: Issue = {
  id: "i1",
  recruitId: RECRUIT_ID,
  entryDate: "2026-09-25",
  title: "VPN not working",
  description: null,
  severity: "HIGH",
  status: "OPEN",
  resolutionNotes: null,
  version: 1,
  createdAt: "2026-09-25T10:00:00Z",
  updatedAt: "2026-09-25T10:00:00Z",
};

function summary(patch: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    recruitId: RECRUIT_ID,
    tasks: { total: 7, byStatus: { TODO: 2, IN_PROGRESS: 1, BLOCKED: 1, DONE: 3 }, completionPercent: 43 },
    issues: { total: 3, open: 2, byStatus: { OPEN: 1, IN_PROGRESS: 1, RESOLVED: 1 }, bySeverity: { HIGH: 2, LOW: 1 }, recentOpen: [issue] },
    feedback: { total: 4, byType: { POSITIVE: 2, SUGGESTION: 1, CONCERN: 1 } },
    notes: { total: 5 },
    recentEntries: [
      { kind: "FEEDBACK", id: "f1", entryDate: "2026-09-26", title: "Great pairing", createdAt: "2026-09-26T12:00:00Z" },
      { kind: "TASK", id: "t1", entryDate: "2026-09-26", title: "Set up IDE", createdAt: "2026-09-26T11:00:00Z" },
      { kind: "ISSUE", id: "i1", entryDate: "2026-09-25", title: "VPN not working", createdAt: "2026-09-25T10:00:00Z" },
      { kind: "NOTE", id: "n1", entryDate: "2026-09-24", title: "Team glossary", createdAt: "2026-09-24T09:00:00Z" },
    ],
    ...patch,
  };
}

function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
  });
}

function errorBody(code: string, message: string) {
  return { code, message, details: [], timestamp: "2026-01-01T00:00:00Z", path: "/api/v1/dashboard" };
}

describe("toDashboardView", () => {
  it("maps every count in contract order, filling missing enum keys with 0", () => {
    const view = toDashboardView(summary());
    expect(view.tasks.total).toBe(7);
    expect(view.tasks.byStatus).toEqual([
      { key: "TODO", count: 2 },
      { key: "IN_PROGRESS", count: 1 },
      { key: "BLOCKED", count: 1 },
      { key: "DONE", count: 3 },
    ]);
    expect(view.tasks.completionPercent).toBe(43);
    expect(view.issues.open).toBe(2);
    expect(view.issues.total).toBe(3);
    expect(view.issues.bySeverity).toEqual([
      { key: "LOW", count: 1 },
      { key: "MEDIUM", count: 0 },
      { key: "HIGH", count: 2 },
      { key: "CRITICAL", count: 0 },
    ]);
    expect(view.issues.byStatus).toEqual([
      { key: "OPEN", count: 1 },
      { key: "IN_PROGRESS", count: 1 },
      { key: "RESOLVED", count: 1 },
      { key: "CLOSED", count: 0 },
    ]);
    expect(view.issues.recentOpen).toEqual([issue]);
    expect(view.feedback).toEqual({
      total: 4,
      byType: [
        { key: "POSITIVE", count: 2 },
        { key: "SUGGESTION", count: 1 },
        { key: "CONCERN", count: 1 },
      ],
    });
    expect(view.notes.total).toBe(5);
    expect(view.isEmpty).toBe(false);
  });

  it("keeps recent entry order and links each kind to its detail route", () => {
    const own = toDashboardView(summary());
    expect(own.recentEntries.map((e) => [e.kind, e.href])).toEqual([
      ["FEEDBACK", "/feedback/f1"],
      ["TASK", "/tasks/t1"],
      ["ISSUE", "/issues/i1"],
      ["NOTE", "/notes/n1"],
    ]);
    const managed = toDashboardView(summary(), RECRUIT_ID);
    expect(managed.recentEntries[1].href).toBe(`/tasks/t1?recruitId=${RECRUIT_ID}`);
    expect(entryHref("ISSUE", "i1", RECRUIT_ID)).toBe(`/issues/i1?recruitId=${RECRUIT_ID}`);
  });

  it("maps an omitted feedback block to null (D3) and clamps completion", () => {
    const view = toDashboardView(summary({ feedback: undefined, tasks: { total: 0, byStatus: {}, completionPercent: 0 } }));
    expect(view.feedback).toBeNull();
    expect(view.tasks.completionPercent).toBe(0);
    expect(view.tasks.byStatus.every((r) => r.count === 0)).toBe(true);
    expect(toDashboardView(summary({ tasks: { total: 3, byStatus: { DONE: 2 }, completionPercent: 66.7 } })).tasks.completionPercent).toBe(67);
  });

  it("flags an empty dashboard", () => {
    const empty = summary({
      tasks: { total: 0, byStatus: {}, completionPercent: 0 },
      issues: { total: 0, open: 0, byStatus: {}, bySeverity: {}, recentOpen: [] },
      feedback: { total: 0, byType: {} },
      notes: { total: 0 },
      recentEntries: [],
    });
    expect(toDashboardView(empty).isEmpty).toBe(true);
  });
});

describe("DashboardStore", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let store: DashboardStore;

  beforeEach(() => {
    fetchMock = vi.fn();
    const api = new ApiClient("http://api.test", fetchMock as unknown as typeof fetch);
    api.setAuthHandlers({ getToken: () => "jwt", onUnauthorized: () => undefined });
    store = new DashboardStore(api);
  });

  const requestUrl = (call: number) => new URL(String(fetchMock.mock.calls[call][0]));

  it("loads the recruit's own dashboard without recruitId", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, summary()));
    await store.load();
    expect(requestUrl(0).pathname).toBe("/api/v1/dashboard");
    expect(requestUrl(0).search).toBe("");
    expect(store.view?.tasks.total).toBe(7);
    expect(store.error).toBeNull();
  });

  it("passes recruitId for the manager/admin tab and hides a summary loaded for another recruit", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, summary()));
    await store.load(RECRUIT_ID);
    expect(requestUrl(0).searchParams.get("recruitId")).toBe(RECRUIT_ID);
    expect(store.view?.recruitId).toBe(RECRUIT_ID);

    let resolve: (r: Response) => void = () => undefined;
    fetchMock.mockReturnValueOnce(new Promise<Response>((r) => (resolve = r)));
    const pending = store.load("other");
    expect(store.view).toBeNull();
    resolve(jsonResponse(200, summary({ recruitId: "other" })));
    await pending;
    expect(store.view?.recruitId).toBe("other");
  });

  it("shows a retryable banner on 5xx and recovers on retry", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(500, errorBody("INTERNAL_ERROR", "boom")));
    await store.load(RECRUIT_ID);
    expect(store.error).toBe("The dashboard could not be loaded right now. Please try again.");
    expect(store.retryable).toBe(true);
    expect(store.view).toBeNull();

    fetchMock.mockResolvedValueOnce(jsonResponse(200, summary()));
    await store.retry();
    expect(requestUrl(1).searchParams.get("recruitId")).toBe(RECRUIT_ID);
    expect(store.error).toBeNull();
    expect(store.view?.issues.open).toBe(2);
  });

  it("drops the previous summary when a reload fails", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, summary()));
    await store.load(RECRUIT_ID);
    expect(store.view?.tasks.total).toBe(7);

    fetchMock.mockResolvedValueOnce(jsonResponse(500, errorBody("INTERNAL_ERROR", "boom")));
    await store.retry();
    expect(store.error).toBe("The dashboard could not be loaded right now. Please try again.");
    expect(store.summary).toBeNull();
    expect(store.view).toBeNull();
  });

  it("maps 403 NOT_ASSIGNED to a non-retryable message", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(403, errorBody("NOT_ASSIGNED", "Not assigned")));
    await store.load(RECRUIT_ID);
    expect(store.error).toBe("You are not assigned to this recruit, so their dashboard is not available.");
    expect(store.retryable).toBe(false);
  });

  it("clear() drops data and ignores in-flight responses", async () => {
    let resolve: (r: Response) => void = () => undefined;
    fetchMock.mockReturnValueOnce(new Promise<Response>((r) => (resolve = r)));
    const pending = store.load();
    store.clear();
    resolve(jsonResponse(200, summary()));
    await pending;
    expect(store.summary).toBeNull();
    expect(store.view).toBeNull();
    expect(store.loading).toBe(false);
  });
});
