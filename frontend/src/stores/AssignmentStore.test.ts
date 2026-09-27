import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClient, ApiError, type Assignment, type Page, type UserSummary } from "@/lib/apiClient";
import { AssignmentStore, assignmentErrorMessage } from "@/stores/AssignmentStore";

const recruit: UserSummary = {
  id: "aaaaaaaa-0000-0000-0000-000000000001",
  email: "recruit@example.com",
  fullName: "Rita Recruit",
  role: "NEW_RECRUIT",
  status: "ACTIVE",
  department: null,
  startDate: null,
};
const managerA: UserSummary = { ...recruit, id: "bbbbbbbb-0000-0000-0000-000000000001", email: "a@example.com", fullName: "Alice Manager", role: "MANAGER" };
const managerB: UserSummary = { ...recruit, id: "bbbbbbbb-0000-0000-0000-000000000002", email: "b@example.com", fullName: "Bob Manager", role: "MANAGER" };
const admin: UserSummary = { ...recruit, id: "cccccccc-0000-0000-0000-000000000001", email: "admin@example.com", fullName: "Ada Admin", role: "ADMIN" };

function assignment(id: string, manager: UserSummary, status: Assignment["status"], assignedAt: string): Assignment {
  return {
    id,
    recruit,
    manager,
    assignedBy: admin,
    status,
    assignedAt,
    endedAt: status === "ACTIVE" ? null : "2026-02-01T00:00:00Z",
    note: null,
    createdAt: assignedAt,
    updatedAt: assignedAt,
  };
}

function page<T>(items: T[]): Page<T> {
  return { items, page: 0, size: 20, totalItems: items.length, totalPages: items.length ? 1 : 0 };
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorBody(code: string, message: string, details: unknown[] = []) {
  return { code, message, details, timestamp: "2026-01-01T00:00:00Z", path: "/api/v1/assignments" };
}

describe("AssignmentStore", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let store: AssignmentStore;

  beforeEach(() => {
    fetchMock = vi.fn();
    const api = new ApiClient("http://api.test", fetchMock as unknown as typeof fetch);
    api.setAuthHandlers({ getToken: () => "jwt", onUnauthorized: () => undefined });
    store = new AssignmentStore(api);
  });

  const requestUrl = (call: number) => String(fetchMock.mock.calls[call][0]);

  it("loads history and derives the current ACTIVE assignment", async () => {
    const active = assignment("a2", managerB, "ACTIVE", "2026-02-01T00:00:00Z");
    const old = assignment("a1", managerA, "REASSIGNED", "2026-01-01T00:00:00Z");
    fetchMock.mockResolvedValueOnce(jsonResponse(200, page([active, old])));

    await store.loadHistory(recruit.id);

    expect(requestUrl(0)).toBe(`http://api.test/api/v1/users/${recruit.id}/assignments?page=0&size=20`);
    expect(store.history?.items).toHaveLength(2);
    expect(store.currentAssignment?.id).toBe("a2");
    expect(store.currentAssignment?.manager.fullName).toBe("Bob Manager");
    expect(store.historyError).toBeNull();
  });

  it("currentAssignment is null when the history has no ACTIVE row", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, page([assignment("a1", managerA, "REASSIGNED", "2026-01-01T00:00:00Z")])));
    await store.loadHistory(recruit.id);
    expect(store.currentAssignment).toBeNull();
  });

  it("assign() posts the request, stores the result and reloads the open history", async () => {
    const created = assignment("a1", managerA, "ACTIVE", "2026-01-01T00:00:00Z");
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, page([])))
      .mockResolvedValueOnce(jsonResponse(201, { assignment: created, superseded: null }))
      .mockResolvedValueOnce(jsonResponse(200, page([created])));

    await store.loadHistory(recruit.id);
    const result = await store.assign({ recruitId: recruit.id, managerId: managerA.id, note: "kickoff" });

    expect(result.assignment.id).toBe("a1");
    expect(result.superseded).toBeNull();
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toBe("http://api.test/api/v1/assignments");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ recruitId: recruit.id, managerId: managerA.id, note: "kickoff" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(store.currentAssignment?.id).toBe("a1");
    expect(store.lastResult?.assignment.id).toBe("a1");
    expect(store.assignError).toBeNull();
    expect(store.assignSubmitting).toBe(false);
  });

  it("reassign result carries the superseded assignment", async () => {
    const created = assignment("a2", managerB, "ACTIVE", "2026-02-01T00:00:00Z");
    const superseded = assignment("a1", managerA, "REASSIGNED", "2026-01-01T00:00:00Z");
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { assignment: created, superseded }));

    const result = await store.assign({ recruitId: recruit.id, managerId: managerB.id });

    expect(result.superseded?.manager.id).toBe(managerA.id);
    expect(store.lastResult?.superseded?.status).toBe("REASSIGNED");
    expect(fetchMock).toHaveBeenCalledTimes(1); // no history open → no reload
  });

  it.each([
    ["ASSIGNMENT_UNCHANGED", 409, "This manager is already assigned to the recruit."],
    ["CONFLICT", 409, "Another reassignment happened at the same time. Refresh and try again."],
    ["FORBIDDEN", 403, "Only administrators can assign managers."],
    ["NOT_FOUND", 404, "The selected user no longer exists."],
  ])("maps %s to user-facing copy in assignError and rethrows", async (code, status, expected) => {
    fetchMock.mockResolvedValueOnce(jsonResponse(status, errorBody(code, "server message")));

    await expect(store.assign({ recruitId: recruit.id, managerId: managerA.id })).rejects.toBeInstanceOf(ApiError);

    expect(store.assignError).toBe(expected);
    expect(store.lastResult).toBeNull();
    expect(store.assignSubmitting).toBe(false);
  });

  it("INVALID_ASSIGNMENT_PARTY surfaces the field detail", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        422,
        errorBody("INVALID_ASSIGNMENT_PARTY", "Invalid party", [
          { field: "managerId", code: "INVALID_VALUE", message: "manager must be an ACTIVE MANAGER" },
        ]),
      ),
    );

    await expect(store.assign({ recruitId: recruit.id, managerId: recruit.id })).rejects.toBeInstanceOf(ApiError);
    expect(store.assignError).toBe("Invalid assignment: manager must be an ACTIVE MANAGER.");
  });

  it("clearAssignFeedback() resets error and result", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(409, errorBody("ASSIGNMENT_UNCHANGED", "x")));
    await store.assign({ recruitId: recruit.id, managerId: managerA.id }).catch(() => undefined);
    expect(store.assignError).not.toBeNull();
    store.clearAssignFeedback();
    expect(store.assignError).toBeNull();
    expect(store.lastResult).toBeNull();
  });

  it("loadManagers() only requests ACTIVE managers", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, page([managerA, managerB])));
    await store.loadManagers();
    const url = new URL(requestUrl(0));
    expect(url.pathname).toBe("/api/v1/users");
    expect(url.searchParams.get("role")).toBe("MANAGER");
    expect(url.searchParams.get("status")).toBe("ACTIVE");
    expect(store.managers.map((m) => m.fullName)).toEqual(["Alice Manager", "Bob Manager"]);
  });

  it("loadMyRecruits() and loadMyManager() hit the /me endpoints", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, page([{ recruit, assignedAt: "2026-01-01T00:00:00Z", openIssueCount: 0 }])))
      .mockResolvedValueOnce(jsonResponse(200, { assignment: assignment("a1", managerA, "ACTIVE", "2026-01-01T00:00:00Z") }));

    await store.loadMyRecruits(1, "assignedAt,desc");
    await store.loadMyManager();

    expect(requestUrl(0)).toBe("http://api.test/api/v1/me/recruits?page=1&size=20&sort=assignedAt%2Cdesc");
    expect(store.myRecruits?.items[0].recruit.fullName).toBe("Rita Recruit");
    expect(requestUrl(1)).toBe("http://api.test/api/v1/me/manager");
    expect(store.myManager?.manager.fullName).toBe("Alice Manager");
    expect(store.myManagerLoaded).toBe(true);
  });

  it("loadMyManager() with no assignment yields null but marks loaded", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { assignment: null }));
    await store.loadMyManager();
    expect(store.myManager).toBeNull();
    expect(store.myManagerLoaded).toBe(true);
    expect(store.myManagerError).toBeNull();
  });

  it("setFilters/setSort reset the page; loadAssignments serialises the query", async () => {
    store.setPage(3);
    store.setFilters({ status: "ACTIVE" });
    expect(store.page).toBe(0);
    store.setPage(2);
    store.setSort("assignedAt,asc");
    expect(store.page).toBe(0);

    fetchMock.mockResolvedValueOnce(jsonResponse(200, page([])));
    await store.loadAssignments();
    const url = new URL(requestUrl(0));
    expect(url.pathname).toBe("/api/v1/assignments");
    expect(url.searchParams.get("status")).toBe("ACTIVE");
    expect(url.searchParams.get("sort")).toBe("assignedAt,asc");
    expect(url.searchParams.has("recruitId")).toBe(false);
    expect(store.assignments?.totalItems).toBe(0);
  });

  it("clear() drops all server-derived state", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, page([assignment("a1", managerA, "ACTIVE", "2026-01-01T00:00:00Z")])));
    await store.loadHistory(recruit.id);
    store.clear();
    expect(store.history).toBeNull();
    expect(store.historyRecruitId).toBeNull();
    expect(store.currentAssignment).toBeNull();
    expect(store.managers).toEqual([]);
  });
});

describe("assignmentErrorMessage", () => {
  it("falls back to the server message for unmapped codes and to Error.message otherwise", () => {
    expect(assignmentErrorMessage(new ApiError(500, "INTERNAL_ERROR", "boom"))).toBe("boom");
    expect(assignmentErrorMessage(new Error("offline"))).toBe("offline");
    expect(assignmentErrorMessage("weird")).toBe("Something went wrong");
  });
});
