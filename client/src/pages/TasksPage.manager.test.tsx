import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TasksPage } from './TasksPage';
import type { Task, TaskCategory, TeamOverview } from '@/lib/types';

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'mgr-1', email: 'm@x', name: 'M', role: 'Manager', timezone: 'Asia/Kolkata' },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

const categories: TaskCategory[] = [{ id: 'cat-1', name: 'Setup', isActive: true }];

const team: TeamOverview = {
  recruits: [
    {
      id: 'rec-1',
      name: 'Rina Recruit',
      email: 'rina@x',
      department: 'Engineering',
      taskTotal: 0,
      taskCompleted: 0,
      completionRate: 0,
      overdue: 0,
      openIssues: 0,
      feedbackTotal: 0,
      noteTotal: 0,
    },
  ],
  totals: { recruits: 1, openIssues: 0, completionRate: 0, overdue: 0 },
};

function makeTasks(n: number): Task[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `t${i}`,
    date: '2026-01-01',
    title: `Task ${i}`,
    description: '',
    categoryId: 'cat-1',
    category: { id: 'cat-1', name: 'Setup', isActive: true },
    status: 'To Do',
    priority: 'Low',
    ownerId: 'rec-1',
    owner: { id: 'rec-1', name: 'Rina Recruit' },
    dueDate: null,
  }));
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, text: () => Promise.resolve(JSON.stringify(body)) } as Response;
}

function routedFetch(tasks: Task[]) {
  return vi.spyOn(global, 'fetch').mockImplementation((input) => {
    const url = String(input);
    if (url.includes('/categories')) return Promise.resolve(jsonResponse(categories));
    if (url.includes('/dashboard/team')) return Promise.resolve(jsonResponse(team));
    if (url.includes('/comments')) return Promise.resolve(jsonResponse([]));
    return Promise.resolve(jsonResponse(tasks));
  });
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/tasks']}>
        <TasksPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TasksPage (manager scope)', () => {
  it('shows the owner label and assigns a new task to an overseen recruit', async () => {
    const fetchMock = routedFetch([]);
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /New task/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Title'), 'Assigned task');
    await userEvent.selectOptions(within(dialog).getByLabelText('Owner'), 'rec-1');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
      expect(post).toBeTruthy();
      expect(JSON.parse((post?.[1]?.body as string) ?? '{}').ownerId).toBe('rec-1');
    });
  });

  it('edits an existing task through the modal', async () => {
    const fetchMock = routedFetch(makeTasks(1));
    renderPage();
    await userEvent.click(await screen.findByLabelText('Edit'));
    expect(screen.getByText('Edit task')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(true),
    );
  });

  it('paginates when there are more than one page of tasks', async () => {
    routedFetch(makeTasks(10));
    renderPage();
    expect(await screen.findByText('Task 0')).toBeInTheDocument();
    expect(screen.queryByText('Task 9')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByText('Task 9')).toBeInTheDocument();
  });
});
