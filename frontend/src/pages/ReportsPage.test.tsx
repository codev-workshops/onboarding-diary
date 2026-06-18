import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ReportsPage } from "./ReportsPage";
import { reportsApi, triggerDownload } from "../api/reports";

vi.mock("../api/reports", async () => {
  const actual = await vi.importActual<typeof import("../api/reports")>("../api/reports");
  return {
    ...actual,
    reportsApi: { download: vi.fn() },
    triggerDownload: vi.fn(),
  };
});

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ logout: vi.fn(), user: { id: 1 } }),
}));

const downloadMock = vi.mocked(reportsApi.download);
const triggerMock = vi.mocked(triggerDownload);

function renderPage() {
  return render(
    <MemoryRouter>
      <ReportsPage />
    </MemoryRouter>,
  );
}

describe("ReportsPage", () => {
  beforeEach(() => {
    downloadMock.mockReset();
    triggerMock.mockReset();
  });

  it("renders report type and date controls and download buttons", () => {
    renderPage();
    expect(screen.getByLabelText("Report type")).toBeInTheDocument();
    expect(screen.getByLabelText("Date from")).toBeInTheDocument();
    expect(screen.getByLabelText("Date to")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download csv/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /download pdf/i })).toBeInTheDocument();
  });

  it("requests a CSV report with the selected type and date range, then triggers a download", async () => {
    const file = { blob: new Blob(["x"]), filename: "issues-report.csv" };
    downloadMock.mockResolvedValueOnce(file);
    renderPage();

    await userEvent.selectOptions(screen.getByLabelText("Report type"), "ISSUES");
    await userEvent.type(screen.getByLabelText("Date from"), "2026-02-01");
    await userEvent.type(screen.getByLabelText("Date to"), "2026-02-28");
    await userEvent.click(screen.getByRole("button", { name: /download csv/i }));

    await waitFor(() =>
      expect(downloadMock).toHaveBeenCalledWith({
        type: "ISSUES",
        format: "CSV",
        dateFrom: "2026-02-01",
        dateTo: "2026-02-28",
      }),
    );
    expect(triggerMock).toHaveBeenCalledWith(file);
  });
});
