import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FeedbackPage } from './FeedbackPage';
import type { Feedback } from '@/lib/types';

const feedback: Feedback = {
  id: 'f1',
  date: '2026-01-05',
  subject: 'Great pairing session',
  type: 'Positive',
  details: 'Very helpful',
  ownerId: 'rec-1',
};

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, text: () => Promise.resolve(JSON.stringify(body)) } as Response;
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <FeedbackPage />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('FeedbackPage', () => {
  it('lists feedback and filters by type', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse([feedback]));
    renderPage();
    expect(await screen.findByText('Great pairing session')).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Filter by type'), 'Concern');
    await waitFor(() => {
      expect(
        fetchMock.mock.calls.some(([url]) => String(url).includes('type=Concern')),
      ).toBe(true);
    });
  });

  it('creates feedback via the modal and deletes an item', async () => {
    const fetchMock = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse([feedback]))
      .mockResolvedValue(jsonResponse(feedback));
    renderPage();
    await userEvent.click(await screen.findByLabelText('Delete'));
    // Confirm the delete in the confirmation dialog.
    const confirm = await screen.findByRole('dialog');
    await userEvent.click(within(confirm).getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(true),
    );

    await userEvent.click(screen.getByRole('button', { name: /New feedback/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Subject'), 'Nice');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(true),
    );
  });
});
