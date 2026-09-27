// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssignmentPanel } from "@/components/admin/AssignmentPanel";
import { ApiClient, type Assignment, type Page, type UserDetail, type UserSummary } from "@/lib/apiClient";
import { AssignmentStore } from "@/stores/AssignmentStore";

const recruit: UserDetail = {
  id: "aaaaaaaa-0000-0000-0000-000000000001",
  email: "rita@example.com",
  fullName: "Rita Recruit",
  role: "NEW_RECRUIT",
  status: "ACTIVE",
  department: null,
  startDate: null,
  invitedAt: "2026-01-01T00:00:00Z",
  activatedAt: "2026-01-02T00:00:00Z",
  createdBy: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
  currentAssignment: null,
  activeRecruitCount: null,
};
const summary = (u: UserDetail): UserSummary => ({
  id: u.id,
  email: u.email,
  fullName: u.fullName,
  role: u.role,
  status: u.status,
  department: u.department,
  startDate: u.startDate,
});
const managerA: UserSummary = { ...summary(recruit), id: "bbbbbbbb-0000-0000-0000-000000000001", email: "alice@example.com", fullName: "Alice Manager", role: "MANAGER" };
const managerB: UserSummary = { ...managerA, id: "bbbbbbbb-0000-0000-0000-000000000002", email: "bob@example.com", fullName: "Bob Manager" };
const admin: UserSummary = { ...managerA, id: "cccccccc-0000-0000-0000-000000000001", email: "admin@example.com", fullName: "Ada Admin", role: "ADMIN" };

const activeWithA: Assignment = {
  id: "a1",
  recruit: summary(recruit),
  manager: managerA,
  assignedBy: admin,
  status: "ACTIVE",
  assignedAt: "2026-01-10T09:00:00Z",
  endedAt: null,
  note: null,
  createdAt: "2026-01-10T09:00:00Z",
  updatedAt: "2026-01-10T09:00:00Z",
};

const text = (el: HTMLElement | Element) => el.textContent ?? "";

function page<T>(items: T[]): Page<T> {
  return { items, page: 0, size: 20, totalItems: items.length, totalPages: items.length ? 1 : 0 };
}
function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
function error(status: number, code: string, details: unknown[] = []) {
  return json(status, { code, message: "server message", details, timestamp: "2026-01-01T00:00:00Z", path: "/api/v1/assignments" });
}

describe("AssignmentPanel", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let store: AssignmentStore;

  /** Routes GET history / GET managers by URL; POST /assignments uses the queued responses. */
  function routeFetch(history: Assignment[], postResponses: Response[]) {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "POST") return Promise.resolve(postResponses.shift() ?? error(500, "INTERNAL_ERROR"));
      if (url.includes("/assignments")) return Promise.resolve(json(200, page(history)));
      if (url.includes("/users?")) return Promise.resolve(json(200, page([managerA, managerB])));
      return Promise.resolve(error(404, "NOT_FOUND"));
    });
  }

  beforeEach(() => {
    fetchMock = vi.fn();
    const api = new ApiClient("http://api.test", fetchMock as unknown as typeof fetch);
    api.setAuthHandlers({ getToken: () => "jwt", onUnauthorized: () => undefined });
    store = new AssignmentStore(api);
  });
  afterEach(cleanup);

  async function submit(managerId: string) {
    await screen.findByRole("option", { name: /Bob Manager/ });
    fireEvent.change(screen.getByLabelText(/Assign manager|Reassign to/), { target: { value: managerId } });
    await act(async () => {
      fireEvent.submit(screen.getByTestId("assign-form"));
    });
  }

  it("shows the current manager and history, and disables the button until a manager is picked", async () => {
    routeFetch([activeWithA], []);
    render(<AssignmentPanel user={recruit} store={store} />);

    await waitFor(() => expect(text(screen.getByTestId("current-manager"))).toContain("Alice Manager"));
    expect(screen.getAllByTestId("history-item")).toHaveLength(1);
    expect(screen.getByLabelText("Reassign to")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reassign" })).toHaveProperty("disabled", true);
    expect(screen.queryByTestId("assign-error")).toBeNull();
  });

  it("shows 'No manager assigned yet' and an Assign button when there is no history", async () => {
    routeFetch([], []);
    render(<AssignmentPanel user={recruit} store={store} />);
    await screen.findByTestId("history-empty");
    expect(text(screen.getByTestId("current-manager"))).toContain("No manager assigned yet.");
    expect(screen.getByRole("button", { name: "Assign" })).toBeTruthy();
  });

  it("renders the ASSIGNMENT_UNCHANGED error when reassigning to the same manager", async () => {
    routeFetch([activeWithA], [error(409, "ASSIGNMENT_UNCHANGED")]);
    render(<AssignmentPanel user={recruit} store={store} />);

    await submit(managerA.id);

    const alert = await screen.findByTestId("assign-error");
    expect(text(alert)).toContain("This manager is already assigned to the recruit.");
    expect(alert.getAttribute("role")).toBe("alert");
    expect(screen.queryByTestId("assign-success")).toBeNull();
    expect(text(screen.getByTestId("current-manager"))).toContain("Alice Manager");
  });

  it("renders the INVALID_ASSIGNMENT_PARTY detail message", async () => {
    routeFetch(
      [],
      [error(422, "INVALID_ASSIGNMENT_PARTY", [{ field: "managerId", code: "INVALID_VALUE", message: "manager must be an ACTIVE MANAGER" }])],
    );
    render(<AssignmentPanel user={recruit} store={store} />);

    await submit(managerB.id);

    expect(text(await screen.findByTestId("assign-error"))).toContain("Invalid assignment: manager must be an ACTIVE MANAGER.");
  });

  it("renders the CONFLICT race message", async () => {
    routeFetch([activeWithA], [error(409, "CONFLICT")]);
    render(<AssignmentPanel user={recruit} store={store} />);

    await submit(managerB.id);

    expect(text(await screen.findByTestId("assign-error"))).toContain("Another reassignment happened at the same time. Refresh and try again.");
  });

  it("clears the error when a different manager is picked and shows success after a reassign", async () => {
    const reassigned: Assignment = { ...activeWithA, id: "a2", manager: managerB, assignedAt: "2026-02-01T09:00:00Z" };
    const superseded: Assignment = { ...activeWithA, status: "REASSIGNED", endedAt: "2026-02-01T09:00:00Z" };
    routeFetch([activeWithA], [error(409, "ASSIGNMENT_UNCHANGED"), json(201, { assignment: reassigned, superseded })]);
    const onAssigned = vi.fn();
    render(<AssignmentPanel user={recruit} store={store} onAssigned={onAssigned} />);

    await submit(managerA.id);
    await screen.findByTestId("assign-error");

    fireEvent.change(screen.getByLabelText("Reassign to"), { target: { value: managerB.id } });
    expect(screen.queryByTestId("assign-error")).toBeNull();

    await act(async () => {
      fireEvent.submit(screen.getByTestId("assign-form"));
    });

    expect(text(await screen.findByTestId("assign-success"))).toContain("Reassigned from Alice Manager to Bob Manager.");
    expect(onAssigned).toHaveBeenCalledTimes(1);
  });

  it("does not offer assignment for non-recruits or inactive recruits", async () => {
    routeFetch([], []);
    const { rerender } = render(<AssignmentPanel user={{ ...recruit, role: "MANAGER" }} store={store} />);
    expect(text(screen.getByTestId("assign-disabled"))).toContain("Only new recruits can be assigned a manager.");
    rerender(<AssignmentPanel user={{ ...recruit, status: "INVITED" }} store={store} />);
    expect(text(screen.getByTestId("assign-disabled"))).toContain("must be ACTIVE");
    expect(screen.queryByTestId("assign-form")).toBeNull();
  });
});
