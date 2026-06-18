import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DashboardPage } from "./DashboardPage";
import { dashboardApi } from "../api/dashboard";
import type { DashboardResponse } from "../api/types";

vi.mock("../api/dashboard", () => ({
  dashboardApi: { get: vi.fn() },
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ logout: vi.fn(), user: { id: 1 } }),
}));

const getMock = vi.mocked(dashboardApi.get);

function dashboard(overrides: Partial<DashboardResponse> = {}): DashboardResponse {
  return {
    summary: { tasks: 4, issues: 2, feedback: 1, notes: 3 },
    taskMetrics: {
      total: 4,
      completed: 1,
      completionRate: 0.25,
      byStatus: { TODO: 2, IN_PROGRESS: 1, DONE: 1 },
    },
    issueMetrics: {
      total: 2,
      open: 1,
      byStatus: { OPEN: 1, IN_PROGRESS: 0, RESOLVED: 1, CLOSED: 0 },
      bySeverity: { LOW: 0, MEDIUM: 1, HIGH: 1, CRITICAL: 0 },
    },
    recentActivity: [
      { type: "TASK", id: 7, ownerId: 1, title: "Setup env", date: "2026-02-02", occurredAt: "2026-02-02T10:00:00Z" },
    ],
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe("DashboardPage", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("renders summary cards from the API", async () => {
    getMock.mockResolvedValueOnce(dashboard());
    renderPage();
    const summary = await screen.findByLabelText("Summary");
    const within = (text: string) =>
      Array.from(summary.querySelectorAll(".summary-label")).some((el) => el.textContent === text);
    expect(within("Tasks")).toBe(true);
    expect(within("Issues")).toBe(true);
    expect(within("Feedback")).toBe(true);
    expect(within("Notes")).toBe(true);
    expect(summary.querySelector(".summary-value")?.textContent).toBe("4");
  });

  it("renders completion rate and open-issue metrics", async () => {
    getMock.mockResolvedValueOnce(dashboard());
    renderPage();
    expect(await screen.findByTestId("completion-rate")).toHaveTextContent("25%");
    expect(screen.getByTestId("open-issues")).toHaveTextContent("1");
  });

  it("renders recent activity with links", async () => {
    getMock.mockResolvedValueOnce(dashboard());
    renderPage();
    const link = await screen.findByRole("link", { name: "Setup env" });
    expect(link).toHaveAttribute("href", "/tasks/7");
  });
});
