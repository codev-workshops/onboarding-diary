import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { TasksPage } from "./TasksPage";
import { tasksApi } from "../api/tasks";
import type { TaskResponse } from "../api/types";

vi.mock("../api/tasks", () => ({
  tasksApi: { list: vi.fn() },
}));

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ logout: vi.fn(), user: { id: 1 } }),
}));

const listMock = vi.mocked(tasksApi.list);

function task(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    id: 1,
    ownerId: 1,
    date: "2026-02-01",
    title: "Read handbook",
    description: "intro",
    category: "LEARNING",
    status: "TODO",
    priority: "HIGH",
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-02-01T00:00:00Z",
    ...overrides,
  };
}

function page(content: TaskResponse[]) {
  return { content, page: 0, size: 20, totalElements: content.length, totalPages: 1 };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <TasksPage />
    </MemoryRouter>,
  );
}

describe("TasksPage", () => {
  beforeEach(() => {
    listMock.mockReset();
  });

  it("renders fetched tasks", async () => {
    listMock.mockResolvedValueOnce(page([task()]));
    renderPage();
    expect(await screen.findByText("Read handbook")).toBeInTheDocument();
    expect(listMock).toHaveBeenCalledWith({});
  });

  it("requests tasks with the selected status filter", async () => {
    listMock.mockResolvedValue(page([task()]));
    renderPage();
    await screen.findByText("Read handbook");

    await userEvent.selectOptions(screen.getByLabelText(/status/i), "DONE");

    await waitFor(() => expect(listMock).toHaveBeenLastCalledWith({ status: "DONE" }));
  });

  it("shows an empty state when there are no tasks", async () => {
    listMock.mockResolvedValueOnce(page([]));
    renderPage();
    expect(await screen.findByText(/no tasks found/i)).toBeInTheDocument();
  });
});
