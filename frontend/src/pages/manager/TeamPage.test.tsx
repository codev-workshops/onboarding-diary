import { screen } from '@testing-library/react';
import * as managerApi from '../../api/manager';
import type { RecruitSummary } from '../../api/manager';
import { fakeAuth, renderWithProviders } from '../../test/renderWithProviders';
import { recruit } from '../../test/fixtures';
import { TeamPage } from './TeamPage';

vi.mock('../../api/manager', async (importOriginal) => ({
  ...(await importOriginal<typeof managerApi>()),
  fetchTeam: vi.fn(),
}));

const api = vi.mocked(managerApi);
const manager = { ...recruit, id: 2, roles: ['MANAGER' as const] };

function summary(overrides: Partial<RecruitSummary> = {}): RecruitSummary {
  return {
    id: 7,
    fullName: 'Ravi Recruit',
    email: 'ravi@example.com',
    jobTitle: null,
    department: 'Engineering',
    startDate: '2026-01-05',
    enabled: true,
    totalTasks: 4,
    completedTasks: 2,
    completionPct: 50,
    openIssues: 1,
    highSeverityOpenIssues: 0,
    lastActivityAt: '2026-01-07T10:00:00Z',
    inactive: false,
    atRisk: false,
    ...overrides,
  };
}

function renderPage() {
  return renderWithProviders(<TeamPage />, {
    auth: fakeAuth({
      status: 'authenticated',
      user: manager,
      hasRole: (...roles) => roles.includes('MANAGER'),
    }),
  });
}

describe('TeamPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists recruits with progress, risk flags and urgent issues', async () => {
    api.fetchTeam.mockResolvedValue({
      recruitCount: 2,
      averageCompletionPct: 37.5,
      openIssues: 3,
      atRiskCount: 1,
      recruits: [
        summary(),
        summary({ id: 8, fullName: 'Ida Idle', inactive: true, atRisk: true, completionPct: 25 }),
      ],
      highSeverityIssues: [
        {
          recruitId: 7,
          recruitName: 'Ravi Recruit',
          issue: {
            id: 3,
            entryDate: '2026-01-06',
            title: 'No VPN',
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
        },
      ],
    });

    renderPage();

    expect(await screen.findByRole('heading', { name: 'My team' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ravi Recruit' })).toHaveAttribute('href', '/team/7');
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByText('On track')).toBeInTheDocument();
    expect(screen.getByText('38%')).toBeInTheDocument();
    expect(screen.getByText('No VPN')).toBeInTheDocument();
  });

  it('explains when no recruits are assigned', async () => {
    api.fetchTeam.mockResolvedValue({
      recruitCount: 0,
      averageCompletionPct: 0,
      openIssues: 0,
      atRiskCount: 0,
      recruits: [],
      highSeverityIssues: [],
    });

    renderPage();

    expect(await screen.findByText(/no recruits are assigned to you yet/i)).toBeInTheDocument();
    expect(screen.getByText('No urgent issues.')).toBeInTheDocument();
  });

  it('shows an error when loading fails', async () => {
    api.fetchTeam.mockRejectedValue(new Error('boom'));
    renderPage();
    expect(await screen.findByText('Could not load the team')).toBeInTheDocument();
  });
});
