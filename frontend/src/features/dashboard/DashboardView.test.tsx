// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { DashboardSummary } from "@/lib/apiClient";
import { DashboardSummaryView } from "@/features/dashboard/DashboardView";
import { toDashboardView } from "@/stores/DashboardStore";

const RECRUIT_ID = "aaaaaaaa-0000-0000-0000-000000000001";

const empty: DashboardSummary = {
  recruitId: RECRUIT_ID,
  tasks: { total: 0, byStatus: { TODO: 0, IN_PROGRESS: 0, BLOCKED: 0, DONE: 0 }, completionPercent: 0 },
  issues: { total: 0, open: 0, byStatus: {}, bySeverity: {}, recentOpen: [] },
  feedback: { total: 0, byType: { POSITIVE: 0, SUGGESTION: 0, CONCERN: 0 } },
  notes: { total: 0 },
  recentEntries: [],
};

const text = (testId: string) => screen.getByTestId(testId).textContent ?? "";

describe("DashboardSummaryView empty state", () => {
  afterEach(cleanup);

  it("shows 0 % completion and a 'Create your first …' call to action in every widget for the recruit", () => {
    render(<DashboardSummaryView view={toDashboardView(empty)} canCreate />);

    expect(text("dashboard-completion-percent")).toBe("0%");
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("0");
    expect(text("dashboard-tasks-total")).toBe("0");
    expect(text("dashboard-issues-open")).toBe("0");
    expect(text("dashboard-feedback-total")).toBe("0");
    expect(text("dashboard-notes-total")).toBe("0");

    const cta = (testId: string) => screen.getByTestId(testId).querySelector("a")?.getAttribute("href");
    expect(text("dashboard-tasks-empty")).toContain("Create your first task");
    expect(cta("dashboard-tasks-empty")).toBe("/tasks/new");
    expect(cta("dashboard-issues-empty")).toBe("/issues/new");
    expect(cta("dashboard-feedback-empty")).toBe("/feedback/new");
    expect(cta("dashboard-notes-empty")).toBe("/notes/new");

    expect(text("dashboard-open-issues-empty")).toBe("No open issues.");
    expect(text("dashboard-recent-empty")).toContain("Nothing logged yet");
    expect(screen.queryByTestId("dashboard-recent")).toBeNull();
    expect(screen.queryByTestId("dashboard-open-issues")).toBeNull();
  });

  it("omits create links on the read-only manager/admin tab and hides the feedback card when omitted", () => {
    render(<DashboardSummaryView view={toDashboardView({ ...empty, feedback: undefined }, RECRUIT_ID)} canCreate={false} recruitId={RECRUIT_ID} />);

    expect(screen.queryByTestId("dashboard-card-feedback")).toBeNull();
    expect(screen.getByTestId("dashboard-tasks-empty").querySelector("a")).toBeNull();
    expect(screen.getByTestId("dashboard-recent-empty").querySelector("a")).toBeNull();
    expect(text("dashboard-completion-percent")).toBe("0%");
  });

  it("renders counts and recent entries once data exists", () => {
    render(
      <DashboardSummaryView
        view={toDashboardView({
          ...empty,
          tasks: { total: 4, byStatus: { TODO: 1, IN_PROGRESS: 1, BLOCKED: 0, DONE: 2 }, completionPercent: 50 },
          recentEntries: [{ kind: "TASK", id: "t1", entryDate: "2026-09-26", title: "Set up IDE", createdAt: "2026-09-26T10:00:00Z" }],
        })}
        canCreate
      />,
    );
    expect(text("dashboard-completion-percent")).toBe("50%");
    expect(text("dashboard-task-DONE")).toContain("2");
    expect(screen.getAllByTestId("dashboard-recent-item")).toHaveLength(1);
    expect(screen.getByTestId("dashboard-recent-item").querySelector("a")?.getAttribute("href")).toBe("/tasks/t1");
  });
});
