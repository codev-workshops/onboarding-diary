import { screen } from '@testing-library/react';
import * as dashboardApi from '../api/dashboard';
import type { DashboardSummary } from '../api/dashboard';
import { fakeAuth, renderWithProviders } from '../test/renderWithProviders';
import { recruit } from '../test/fixtures';
import { DashboardPage } from './DashboardPage';

vi.mock('../api/dashboard', async (importOriginal) => ({
  ...(await importOriginal<typeof dashboardApi>()),
  fetchDashboardSummary: vi.fn(),
  fetchRecentEntries: vi.fn(),
}));

const api = vi.mocked(dashboardApi);

function summary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    startDate: '2026-01-05',
    daysSinceStart: 10,
    tasks: {
      total: 4,
      byStatus: { TODO: 1, IN_PROGRESS: 0, COMPLETED: 3, BLOCKED: 0 },
      completionPct: 75,
    },
    issues: { open: 2, openBySeverity: { LOW: 0, MEDIUM: 1, HIGH: 0, CRITICAL: 1 } },
    feedback: { total: 1, byType: { POSITIVE: 1, SUGGESTION: 0, CONCERN: 0 } },
    notes: { total: 5 },
    weeklyCompletedTrend: Array.from({ length: 8 }, (_, i) => ({
      weekStart: `2026-01-${String(5 + i).padStart(2, '0')}`,
      completed: i === 7 ? 3 : 0,
    })),
    topOpenIssues: [
      {
        id: 9,
        entryDate: '2026-01-06',
        title: 'No VPN access',
        description: null,
        severity: 'CRITICAL',
        status: 'OPEN',
        resolutionNotes: null,
        resolvedAt: null,
        relatedTaskId: null,
        relatedTaskTitle: null,
        createdAt: '2026-01-06T09:00:00Z',
        updatedAt: '2026-01-06T09:00:00Z',
        version: 0,
      },
    ],
    ...overrides,
  };
}

function renderPage() {
  return renderWithProviders(<DashboardPage />, {
    auth: fakeAuth({ status: 'authenticated', user: recruit }),
  });
}

describe('DashboardPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows counts, completion, open issues and recent activity', async () => {
    api.fetchDashboardSummary.mockResolvedValue(summary());
    api.fetchRecentEntries.mockResolvedValue([
      {
        type: 'TASK',
        id: 1,
        entryDate: '2026-01-07',
        title: 'Set up laptop',
        status: 'COMPLETED',
        updatedAt: '2026-01-07T10:00:00Z',
      },
    ]);

    renderPage();

    expect(await screen.findByText('75%')).toBeInTheDocument();
    expect(screen.getByText('Welcome, Asha')).toBeInTheDocument();
    expect(screen.getByText('3 completed')).toBeInTheDocument();
    expect(screen.getByText('1 high or critical')).toBeInTheDocument();
    expect(screen.getByText('No VPN access')).toBeInTheDocument();
    expect(screen.getByText('Set up laptop')).toBeInTheDocument();
    expect(screen.getAllByTestId('trend-bar')).toHaveLength(8);
    expect(screen.getByRole('link', { name: /view all \(2\)/i })).toHaveAttribute(
      'href',
      '/issues?status=OPEN,IN_PROGRESS',
    );
    expect(screen.getByRole('link', { name: 'Task' })).toHaveAttribute('href', '/tasks?new=1');
  });

  it('shows empty states for a new recruit', async () => {
    api.fetchDashboardSummary.mockResolvedValue(
      summary({
        tasks: {
          total: 0,
          byStatus: { TODO: 0, IN_PROGRESS: 0, COMPLETED: 0, BLOCKED: 0 },
          completionPct: 0,
        },
        issues: { open: 0, openBySeverity: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 } },
        topOpenIssues: [],
      }),
    );
    api.fetchRecentEntries.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('No open issues. Nice!')).toBeInTheDocument();
    expect(screen.getByText('Nothing logged yet.')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('shows an error when the summary cannot be loaded', async () => {
    api.fetchDashboardSummary.mockRejectedValue(new Error('boom'));
    api.fetchRecentEntries.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('Could not load the dashboard')).toBeInTheDocument();
  });
});
