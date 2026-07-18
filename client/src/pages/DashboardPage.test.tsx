import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from './DashboardPage';
import type { DashboardSummary } from '@/lib/types';

const summary: DashboardSummary = {
  tasks: { total: 4, completed: 2, completionRate: 50, overdue: 2, byStatus: { 'To Do': 2, Done: 2 } },
  issues: { total: 3, open: 1, bySeverity: { High: 1, Low: 2 } },
  feedback: { total: 1 },
  notes: { total: 1 },
  recentEntries: [
    { id: 'a', kind: 'task', title: 'Setup laptop', date: '2026-01-01', createdAt: '2026-01-01' },
  ],
};

const empty: DashboardSummary = {
  tasks: { total: 0, completed: 0, completionRate: 0, overdue: 0, byStatus: {} },
  issues: { total: 0, open: 0, bySeverity: {} },
  feedback: { total: 0 },
  notes: { total: 0 },
  recentEntries: [],
};

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return { ok, status, text: () => Promise.resolve(JSON.stringify(body)) } as Response;
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DashboardPage', () => {
  it('renders stats, the overdue alert and recent entries', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(summary));
    renderPage();
    expect(await screen.findByText('Setup laptop')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('overdue');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  });

  it('renders empty states when there is no data', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(jsonResponse(empty));
    renderPage();
    expect(await screen.findByText('No tasks yet')).toBeInTheDocument();
    expect(screen.getByText('No issues logged')).toBeInTheDocument();
    expect(screen.getByText('No recent activity')).toBeInTheDocument();
  });
});
