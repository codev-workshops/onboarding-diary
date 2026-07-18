import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TasksPage } from './TasksPage';
import type { Task, TaskCategory } from '@/lib/types';

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'rec-1', email: 'r@x', name: 'R', role: 'Recruit', timezone: 'UTC' },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

const categories: TaskCategory[] = [{ id: 'cat-1', name: 'Setup', isActive: true }];

const overdueTask: Task = {
  id: 't1',
  date: '2026-01-01',
  title: 'Install tooling',
  description: 'Set up laptop',
  categoryId: 'cat-1',
  category: { id: 'cat-1', name: 'Setup', isActive: true },
  status: 'To Do',
  priority: 'High',
  ownerId: 'rec-1',
  dueDate: '2020-01-01',
};

const doneTask: Task = {
  id: 't2',
  date: '2026-02-02',
  title: 'Finish orientation',
  description: 'Completed already',
  categoryId: 'cat-1',
  category: { id: 'cat-1', name: 'Setup', isActive: true },
  status: 'Done',
  priority: 'Low',
  ownerId: 'rec-1',
  dueDate: null,
};

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, text: () => Promise.resolve(JSON.stringify(body)) } as Response;
}

function routedFetch(tasks: Task[]) {
  return vi.spyOn(global, 'fetch').mockImplementation((input) => {
    const url = String(input);
    if (url.includes('/categories')) return Promise.resolve(jsonResponse(categories));
    if (url.includes('/comments')) return Promise.resolve(jsonResponse([]));
    return Promise.resolve(jsonResponse(tasks));
  });
}

function renderPage(initialEntries = ['/tasks']) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={initialEntries}>
        <TasksPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TasksPage', () => {
  it('renders tasks and flags an overdue task', async () => {
    routedFetch([overdueTask]);
    renderPage();
    expect(await screen.findByText('Install tooling')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
  });

  it('creates a task through the modal, defaulting the category', async () => {
    const fetchMock = routedFetch([]);
    renderPage();
    expect(await screen.findByText('No tasks yet')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /New task/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Title'), 'Read handbook');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
      expect(post).toBeTruthy();
      expect(JSON.parse((post?.[1]?.body as string) ?? '{}').categoryId).toBe('cat-1');
    });
  });

  it('opens the comments modal from a deep link', async () => {
    routedFetch([overdueTask]);
    renderPage(['/tasks?taskId=t1']);
    expect(await screen.findByText('Comments — Install tooling')).toBeInTheDocument();
  });

  it('hides completed tasks by default and reveals them via the toggle', async () => {
    routedFetch([overdueTask, doneTask]);
    renderPage();
    expect(await screen.findByText('Install tooling')).toBeInTheDocument();
    expect(screen.queryByText('Finish orientation')).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Show completed'));
    expect(await screen.findByText('Finish orientation')).toBeInTheDocument();
  });

  it('filters tasks by the search box', async () => {
    routedFetch([overdueTask, doneTask]);
    renderPage();
    await userEvent.click(await screen.findByLabelText('Show completed'));
    await userEvent.type(screen.getByLabelText('Search tasks'), 'orientation');
    expect(await screen.findByText('Finish orientation')).toBeInTheDocument();
    expect(screen.queryByText('Install tooling')).not.toBeInTheDocument();
  });

  it('reorders tasks via the sort control', async () => {
    const laterTask: Task = { ...overdueTask, id: 't3', title: 'Later task', date: '2026-05-05', dueDate: null };
    routedFetch([overdueTask, laterTask]);
    renderPage();

    // Default sort is newest first: the later-dated task precedes the earlier one.
    const earlier = await screen.findByText('Install tooling');
    const later = screen.getByText('Later task');
    expect(later.compareDocumentPosition(earlier) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await userEvent.selectOptions(screen.getByLabelText('Sort by'), 'date-asc');
    await waitFor(() => {
      const e = screen.getByText('Install tooling');
      const l = screen.getByText('Later task');
      expect(e.compareDocumentPosition(l) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  it('confirms before deleting a task', async () => {
    const fetchMock = routedFetch([overdueTask]);
    renderPage();
    await userEvent.click(await screen.findByLabelText('Delete'));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(true),
    );
  });
});
