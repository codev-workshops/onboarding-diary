import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { NotesPage } from "./NotesPage";
import { notesApi } from "../api/notes";
import type { NoteResponse } from "../api/types";

vi.mock("../api/notes", () => ({
  notesApi: { list: vi.fn() },
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ logout: vi.fn(), user: { id: 1 } }),
}));

const listMock = vi.mocked(notesApi.list);

function note(overrides: Partial<NoteResponse> = {}): NoteResponse {
  return {
    id: 1,
    ownerId: 1,
    date: "2026-02-01",
    title: "Setup laptop",
    content: "installed tools",
    tags: ["setup", "docs"],
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-01T00:00:00Z",
    ...overrides,
  };
}

function page(content: NoteResponse[]) {
  return { content, page: 0, size: 20, totalElements: content.length, totalPages: 1 };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <NotesPage />
    </MemoryRouter>,
  );
}

describe("NotesPage", () => {
  beforeEach(() => {
    listMock.mockReset();
  });

  it("renders fetched notes with tags", async () => {
    listMock.mockResolvedValueOnce(page([note()]));
    renderPage();
    expect(await screen.findByText("Setup laptop")).toBeInTheDocument();
    expect(screen.getByText("setup")).toBeInTheDocument();
    expect(listMock).toHaveBeenCalledWith({});
  });

  it("requests notes with parsed tag filters", async () => {
    listMock.mockResolvedValue(page([note()]));
    renderPage();
    await screen.findByText("Setup laptop");

    await userEvent.type(screen.getByLabelText(/tags/i), "Setup, Week1");

    await waitFor(() => expect(listMock).toHaveBeenLastCalledWith({ tags: ["setup", "week1"] }));
  });

  it("shows an empty state when there are no notes", async () => {
    listMock.mockResolvedValueOnce(page([]));
    renderPage();
    expect(await screen.findByText(/no notes found/i)).toBeInTheDocument();
  });
});
