import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MentionsBell } from './MentionsBell';

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

const mention = {
  id: 'm1',
  readAt: null,
  createdAt: '2026-06-01T00:00:00.000Z',
  comment: {
    id: 'c1',
    body: 'Please review @manager.eng',
    createdAt: '2026-06-01T00:00:00.000Z',
    author: { id: 'u1', name: 'Rina Recruit', email: 'recruit.rina@demo.local' },
    task: { id: 't1', title: 'Read team documentation' },
  },
};

function renderBell() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MentionsBell />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('MentionsBell', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the unread count and marks read when opened', async () => {
    const posted: string[] = [];
    vi.spyOn(global, 'fetch').mockImplementation((input, init) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      if (url.includes('/api/mentions/read') && method === 'POST') {
        posted.push(url);
        return Promise.resolve(jsonResponse(null));
      }
      if (url.includes('/api/mentions')) {
        return Promise.resolve(jsonResponse({ items: [mention], unread: 1 }));
      }
      return Promise.resolve(jsonResponse({}));
    });

    renderBell();

    // Badge shows the unread count.
    const bell = await screen.findByRole('button', { name: /activity \(1 unread\)/i });
    await userEvent.click(bell);

    // Panel lists the mention and mark-read is called.
    expect(await screen.findByText(/mentioned you on/i)).toBeInTheDocument();
    expect(screen.getByText('Read team documentation')).toBeInTheDocument();
    await waitFor(() => expect(posted).toHaveLength(1));
  });
});
