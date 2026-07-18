import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReportsPage } from './ReportsPage';
import type { ReportData, User } from '@/lib/types';

vi.mock('@/auth/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'a1', email: 'a@x', name: 'Admin', role: 'Admin', timezone: 'UTC' },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

const users: User[] = [
  { id: 'r1', email: 'r@x', name: 'Rina', role: 'Recruit', timezone: 'UTC', startDate: '2026-01-01', departmentId: 'd1', managerId: 'm1', isActive: true, createdAt: '', updatedAt: '' },
];

const report: ReportData = {
  meta: { start: '2026-01-01', end: '2026-01-31', generatedAt: '', generatedBy: 'Admin', scope: 'Org' },
  summary: { taskTotal: 2, taskCompleted: 1, issueTotal: 1, issueOpen: 1, feedbackTotal: 1, noteTotal: 1 },
  tasks: [{ date: '2026-01-02', title: 'T', description: '', category: 'Setup', status: 'Done', priority: 'Low', owner: 'Rina' }],
  issues: [{ date: '2026-01-03', title: 'I', description: '', severity: 'High', status: 'Open', resolutionNotes: '', owner: 'Rina' }],
  feedback: [{ date: '2026-01-04', subject: 'F', type: 'Positive', details: '', owner: 'Rina' }],
  notes: [{ date: '2026-01-05', title: 'N', content: '', tags: '', owner: 'Rina' }],
};

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(body)) } as Response;
}

const emptyReport: ReportData = {
  meta: { start: '2026-01-01', end: '2026-01-31', generatedAt: '', generatedBy: 'Admin', scope: 'Org' },
  summary: { taskTotal: 0, taskCompleted: 0, issueTotal: 0, issueOpen: 0, feedbackTotal: 0, noteTotal: 0 },
  tasks: [],
  issues: [],
  feedback: [],
  notes: [],
};

function renderPage(reportBody: ReportData = report) {
  const fetchMock = vi.spyOn(global, 'fetch').mockImplementation((input) => {
    const url = String(input);
    if (url.includes('/dashboard/team'))
      return Promise.resolve(jsonResponse({ recruits: users, totals: {} }));
    if (url.includes('/users')) return Promise.resolve(jsonResponse(users));
    return Promise.resolve(jsonResponse(reportBody));
  });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <ReportsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return fetchMock;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ReportsPage', () => {
  it('shows an empty state, then generates and renders a scoped report', async () => {
    renderPage();
    expect(await screen.findByText('No report yet')).toBeInTheDocument();
    // recruit scope selector is available to admins
    expect(await screen.findByLabelText('Recruit')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Generate report/ }));
    expect(await screen.findByTestId('report-view')).toBeInTheDocument();
    expect(screen.getByText('Tasks (1)')).toBeInTheDocument();
    expect(screen.getByText('Issues (1)')).toBeInTheDocument();
    // export buttons appear once a report exists
    expect(screen.getByRole('button', { name: /PDF/ })).toBeInTheDocument();
  });

  it('shows a distinct "No data" state when a generated report has zero rows', async () => {
    renderPage(emptyReport);
    expect(await screen.findByText('No report yet')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Generate report/ }));

    expect(await screen.findByText('No data')).toBeInTheDocument();
    // distinct from the initial state and never renders the report body
    expect(screen.queryByText('No report yet')).not.toBeInTheDocument();
    expect(screen.queryByTestId('report-view')).not.toBeInTheDocument();
  });
});
