import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { IssuesPage } from "./IssuesPage";
import { issuesApi } from "../api/issues";
import type { IssueResponse } from "../api/types";

vi.mock("../api/issues", () => ({
  issuesApi: { list: vi.fn() },
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ logout: vi.fn(), user: { id: 1 } }),
}));

const listMock = vi.mocked(issuesApi.list);

function issue(overrides: Partial<IssueResponse> = {}): IssueResponse {
  return {
    id: 1,
    ownerId: 1,
    date: "2026-02-01",
    title: "VPN drops",
    description: "disconnects hourly",
    severity: "HIGH",
    status: "OPEN",
    resolutionNotes: null,
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-01T00:00:00Z",
    ...overrides,
  };
}

function page(content: IssueResponse[]) {
  return { content, page: 0, size: 20, totalElements: content.length, totalPages: 1 };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <IssuesPage />
    </MemoryRouter>,
  );
}

describe("IssuesPage", () => {
  beforeEach(() => {
    listMock.mockReset();
  });

  it("renders fetched issues", async () => {
    listMock.mockResolvedValueOnce(page([issue()]));
    renderPage();
    expect(await screen.findByText("VPN drops")).toBeInTheDocument();
    expect(listMock).toHaveBeenCalledWith({});
  });

  it("requests issues with the selected severity filter", async () => {
    listMock.mockResolvedValue(page([issue()]));
    renderPage();
    await screen.findByText("VPN drops");

    await userEvent.selectOptions(screen.getByLabelText(/severity/i), "CRITICAL");

    await waitFor(() => expect(listMock).toHaveBeenLastCalledWith({ severity: "CRITICAL" }));
  });

  it("shows an empty state when there are no issues", async () => {
    listMock.mockResolvedValueOnce(page([]));
    renderPage();
    expect(await screen.findByText(/no issues found/i)).toBeInTheDocument();
  });
});
