import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TaskComments } from './TaskComments';
import type { Comment, Task } from '@/lib/types';

const task: Task = {
  id: 'task-1',
  date: '2026-01-01',
  title: 'Set up laptop',
  description: '',
  categoryId: 'cat-1',
  status: 'To Do',
  priority: 'Low',
  ownerId: 'rec-1',
  dueDate: null,
};

const existing: Comment = {
  id: 'c-1',
  body: 'Please review @manager.eng',
  createdAt: '2026-01-02T10:00:00.000Z',
  author: { id: 'rec-1', name: 'Rina Recruit', email: 'recruit.rina@demo.local' },
  mentions: [],
};

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

function renderComments() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <TaskComments task={task} onClose={() => undefined} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TaskComments', () => {
  it('lists existing comments and highlights @mentions', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse([existing]));
    renderComments();
    await waitFor(() => expect(screen.getByText('Rina Recruit')).toBeInTheDocument());
    expect(screen.getByText('@manager.eng')).toBeInTheDocument();
  });

  it('shows an empty state and posts a new comment', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ ...existing, body: 'Hello @manager.eng' }))
      .mockResolvedValue(jsonResponse([{ ...existing, body: 'Hello @manager.eng' }]));

    renderComments();
    await waitFor(() => expect(screen.getByText('No comments yet')).toBeInTheDocument());

    await userEvent.type(screen.getByLabelText('Add a comment'), 'Hello @manager.eng');
    await userEvent.click(screen.getByRole('button', { name: /^Comment$/ }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
      expect(post).toBeTruthy();
    });
  });
});
