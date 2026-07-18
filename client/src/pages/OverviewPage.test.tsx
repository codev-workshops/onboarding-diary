import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OverviewPage } from './OverviewPage';
import type { DashboardSummary, Department, TaskCategory, User } from '@/lib/types';

const users: User[] = [
  { id: 'm1', email: 'm@x', name: 'Mgr', role: 'Manager', timezone: 'UTC', startDate: '2026-01-01', departmentId: 'd1', managerId: null, isActive: true, createdAt: '', updatedAt: '' },
  { id: 'r1', email: 'r@x', name: 'Rec', role: 'Recruit', timezone: 'UTC', startDate: '2026-01-01', departmentId: 'd1', managerId: 'm1', isActive: true, createdAt: '', updatedAt: '' },
];
const departments: Department[] = [{ id: 'd1', name: 'Engineering' }];
const categories: TaskCategory[] = [
  { id: 'c1', name: 'Setup', isActive: true },
  { id: 'c2', name: 'Old', isActive: false },
];
const summary: DashboardSummary = {
  tasks: { total: 5, completed: 3, completionRate: 60, overdue: 0, byStatus: {} },
  issues: { total: 2, open: 1, bySeverity: {} },
  feedback: { total: 4 },
  notes: { total: 6 },
  recentEntries: [],
};

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(body)) } as Response;
}

function renderPage(demoMode = false) {
  vi.spyOn(global, 'fetch').mockImplementation((input) => {
    const url = String(input);
    if (url.includes('/config')) return Promise.resolve(jsonResponse({ demoMode, onboardingEnablersEnabled: demoMode, datasource: demoMode ? 'demo' : 'production' }));
    if (url.includes('/users')) return Promise.resolve(jsonResponse(users));
    if (url.includes('/departments')) return Promise.resolve(jsonResponse(departments));
    if (url.includes('/categories')) return Promise.resolve(jsonResponse(categories));
    return Promise.resolve(jsonResponse(summary));
  });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <OverviewPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OverviewPage', () => {
  it('summarizes users, departments, active categories and aggregate activity', async () => {
    renderPage();
    expect(await screen.findByText('1 managers · 1 recruits')).toBeInTheDocument();
    expect(screen.getByText('Aggregate activity')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
    expect(screen.getByText('active task categories')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Manage users/ })).toHaveAttribute('href', '/admin');
  });

  it('shows a link to the setup tool only in demo mode', async () => {
    renderPage(true);
    const link = await screen.findByRole('link', { name: /Open the setup tool/ });
    expect(link).toHaveAttribute('href', 'http://localhost:4100');
  });

  it('hides the setup tool link in production', async () => {
    renderPage(false);
    await screen.findByText('1 managers · 1 recruits');
    expect(screen.queryByRole('link', { name: /Open the setup tool/ })).not.toBeInTheDocument();
  });
});
