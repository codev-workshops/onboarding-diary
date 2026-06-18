import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AnalyticsPage } from "./AnalyticsPage";
import { analyticsApi, type AnalyticsResponse } from "../api/analytics";

vi.mock("../api/analytics", () => ({
  analyticsApi: { load: vi.fn() },
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ logout: vi.fn(), user: { id: 1 } }),
}));

const loadMock = vi.mocked(analyticsApi.load);

const sample: AnalyticsResponse = {
  dateFrom: null,
  dateTo: null,
  taskCompletionTrend: [{ date: "2026-02-01", total: 2, completed: 1, completionRate: 0.5 }],
  issueSeverityDistribution: { LOW: 0, MEDIUM: 0, HIGH: 1, CRITICAL: 0 },
  issueStatusDistribution: { OPEN: 1, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 },
  feedbackTypeDistribution: { POSITIVE: 1, SUGGESTION: 0, CONCERN: 0 },
  activityVolumeTrend: [{ date: "2026-02-01", tasks: 2, issues: 1, feedback: 1, notes: 0, total: 4 }],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AnalyticsPage />
    </MemoryRouter>,
  );
}

describe("AnalyticsPage", () => {
  beforeEach(() => {
    loadMock.mockReset();
  });

  it("loads analytics on mount and renders all five chart sections", async () => {
    loadMock.mockResolvedValue(sample);
    renderPage();

    await waitFor(() => expect(loadMock).toHaveBeenCalledWith({ dateFrom: undefined, dateTo: undefined }));

    expect(await screen.findByText("Task completion trend")).toBeInTheDocument();
    expect(screen.getByText("Activity volume over time")).toBeInTheDocument();
    expect(screen.getByText("Issue severity distribution")).toBeInTheDocument();
    expect(screen.getByText("Issue status distribution")).toBeInTheDocument();
    expect(screen.getByText("Feedback type distribution")).toBeInTheDocument();
  });

  it("re-requests analytics with the chosen date range when Apply is clicked", async () => {
    loadMock.mockResolvedValue(sample);
    renderPage();
    await waitFor(() => expect(loadMock).toHaveBeenCalledTimes(1));

    await userEvent.type(screen.getByLabelText("Date from"), "2026-02-01");
    await userEvent.type(screen.getByLabelText("Date to"), "2026-02-28");
    await userEvent.click(screen.getByRole("button", { name: /apply/i }));

    await waitFor(() =>
      expect(loadMock).toHaveBeenLastCalledWith({ dateFrom: "2026-02-01", dateTo: "2026-02-28" }),
    );
  });
});
