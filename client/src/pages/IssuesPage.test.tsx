import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IssuesPage } from './IssuesPage';
import type { Issue } from '@/lib/types';

const issue: Issue = {
  id: 'i1',
  date: '2026-01-05',
  title: 'Laptop not provisioned',
  description: 'Waiting on IT',
  severity: 'High',
  status: 'Open',
  resolutionNotes: 'Ticket raised',
  ownerId: 'rec-1',
};

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, text: () => Promise.resolve(JSON.stringify(body)) } as Response;
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <IssuesPage />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('IssuesPage', () => {
  it('renders issues with resolution notes and filters by status/severity', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse([issue]));
    renderPage();
    expect(await screen.findByText('Laptop not provisioned')).toBeInTheDocument();
    expect(screen.getByText(/Resolution: Ticket raised/)).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('Filter by status'), 'Open');
    await userEvent.selectOptions(screen.getByLabelText('Filter by severity'), 'High');
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.some(
          ([url]) => String(url).includes('status=Open') && String(url).includes('severity=High'),
        ),
      ).toBe(true),
    );
  });

  it('edits an existing issue', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse([issue]));
    renderPage();
    await userEvent.click(await screen.findByLabelText('Edit'));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Title')).toHaveValue('Laptop not provisioned');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(true),
    );
  });
});
