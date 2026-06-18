import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { SearchPage } from "./SearchPage";
import { searchApi, type SearchResponse } from "../api/search";

vi.mock("../api/search", () => ({
  searchApi: { query: vi.fn() },
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ logout: vi.fn(), user: { id: 1 } }),
}));

const queryMock = vi.mocked(searchApi.query);

function renderPage() {
  return render(
    <MemoryRouter>
      <SearchPage />
    </MemoryRouter>,
  );
}

describe("SearchPage", () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it("renders the search box, entity-type filters and sort selector", () => {
    renderPage();
    expect(screen.getByLabelText("Search query")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Tasks" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Issues" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Feedback" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Notes" })).toBeInTheDocument();
    expect(screen.getByLabelText("Sort by")).toBeInTheDocument();
  });

  it("submits the query with selected type filter and sort, then renders results", async () => {
    const response: SearchResponse = {
      query: "onboarding",
      total: 1,
      results: [
        {
          type: "TASK",
          id: 7,
          ownerId: 1,
          title: "Onboarding plan",
          snippet: "the onboarding plan doc",
          date: "2026-02-01",
          occurredAt: "2026-02-01T00:00:00Z",
          score: 2,
        },
      ],
    };
    queryMock.mockResolvedValueOnce(response);
    renderPage();

    await userEvent.type(screen.getByLabelText("Search query"), "onboarding");
    await userEvent.click(screen.getByRole("checkbox", { name: "Tasks" }));
    await userEvent.selectOptions(screen.getByLabelText("Sort by"), "DATE");
    await userEvent.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() =>
      expect(queryMock).toHaveBeenCalledWith({
        q: "onboarding",
        types: ["TASK"],
        sort: "DATE",
      }),
    );

    const link = await screen.findByRole("link", { name: "Onboarding plan" });
    expect(link).toHaveAttribute("href", "/tasks/7");
    expect(screen.getByText(/1 result for/i)).toBeInTheDocument();
  });
});
