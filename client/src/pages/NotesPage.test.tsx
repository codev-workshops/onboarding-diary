import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotesPage } from './NotesPage';
import type { Note } from '@/lib/types';

const note: Note = {
  id: 'n1',
  date: '2026-01-05',
  title: 'Week one reflection',
  content: 'Learned a lot',
  tags: ['week-1'],
  ownerId: 'rec-1',
};

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, text: () => Promise.resolve(JSON.stringify(body)) } as Response;
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <NotesPage />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('NotesPage', () => {
  it('renders notes with tags and supports deletion', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse([note]));
    renderPage();
    expect(await screen.findByText('Week one reflection')).toBeInTheDocument();
    expect(screen.getByText('week-1')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Delete'));
    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(true);
    });
  });

  it('shows an empty state and creates a note', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValue(jsonResponse(note));
    renderPage();
    expect(await screen.findByText('No notes yet')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /New note/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Title'), 'My note');
    await userEvent.type(within(dialog).getByLabelText(/Tags/), 'a, b');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
      expect(post).toBeTruthy();
      expect(JSON.parse((post?.[1]?.body as string) ?? '{}').tags).toEqual(['a', 'b']);
    });
  });

  it('opens the edit modal prefilled from a note', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse([note]));
    renderPage();
    await userEvent.click(await screen.findByLabelText('Edit'));
    expect(screen.getByText('Edit note')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('Week one reflection');
  });

  it('renders an error state on failure', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse({ error: { message: 'Boom' } }, false, 500));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Boom');
  });
});
