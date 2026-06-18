import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { FeedbackPage } from "./FeedbackPage";
import { feedbackApi } from "../api/feedback";
import type { FeedbackResponse } from "../api/types";

vi.mock("../api/feedback", () => ({
  feedbackApi: { list: vi.fn() },
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ logout: vi.fn(), user: { id: 1 } }),
}));

const listMock = vi.mocked(feedbackApi.list);

function feedback(overrides: Partial<FeedbackResponse> = {}): FeedbackResponse {
  return {
    id: 1,
    ownerId: 1,
    date: "2026-02-01",
    subject: "Buddy was great",
    type: "POSITIVE",
    details: "helped a lot",
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-01T00:00:00Z",
    ...overrides,
  };
}

function page(content: FeedbackResponse[]) {
  return { content, page: 0, size: 20, totalElements: content.length, totalPages: 1 };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <FeedbackPage />
    </MemoryRouter>,
  );
}

describe("FeedbackPage", () => {
  beforeEach(() => {
    listMock.mockReset();
  });

  it("renders fetched feedback", async () => {
    listMock.mockResolvedValueOnce(page([feedback()]));
    renderPage();
    expect(await screen.findByText("Buddy was great")).toBeInTheDocument();
    expect(listMock).toHaveBeenCalledWith({});
  });

  it("requests feedback with the selected type filter", async () => {
    listMock.mockResolvedValue(page([feedback()]));
    renderPage();
    await screen.findByText("Buddy was great");

    await userEvent.selectOptions(screen.getByLabelText(/type/i), "CONCERN");

    await waitFor(() => expect(listMock).toHaveBeenLastCalledWith({ type: "CONCERN" }));
  });

  it("shows an empty state when there is no feedback", async () => {
    listMock.mockResolvedValueOnce(page([]));
    renderPage();
    expect(await screen.findByText(/no feedback found/i)).toBeInTheDocument();
  });
});
