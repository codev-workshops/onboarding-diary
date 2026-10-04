import { screen } from '@testing-library/react';
import * as managerApi from '../../api/manager';
import { fakeAuth, renderWithProviders } from '../../test/renderWithProviders';
import { page, recruit, task } from '../../test/fixtures';
import { RecruitDetailPage } from './RecruitDetailPage';

vi.mock('../../api/manager', async (importOriginal) => ({
  ...(await importOriginal<typeof managerApi>()),
  fetchRecruit: vi.fn(),
  listRecruitEntries: vi.fn(),
}));

const api = vi.mocked(managerApi);
const manager = { ...recruit, id: 2, roles: ['MANAGER' as const] };

function renderAt(route: string) {
  return renderWithProviders(<RecruitDetailPage />, {
    auth: fakeAuth({ status: 'authenticated', user: manager }),
    route,
    path: '/team/:recruitId/:tab?',
  });
}

describe('RecruitDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.fetchRecruit.mockResolvedValue({
      id: 7,
      fullName: 'Ravi Recruit',
      email: 'ravi@example.com',
      jobTitle: 'Developer',
      department: 'Engineering',
      startDate: '2026-01-05',
      enabled: true,
      totalTasks: 1,
      completedTasks: 0,
      completionPct: 0,
      openIssues: 0,
      highSeverityOpenIssues: 0,
      checklistItems: 4,
      checklistItemsCompleted: 1,
      lastActivityAt: null,
      inactive: false,
      atRisk: false,
    });
  });

  it('shows the recruit tasks read-only, filtered from the URL', async () => {
    api.listRecruitEntries.mockResolvedValue(page([task({ title: 'Read handbook' })]));

    renderAt('/team/7/tasks?status=TODO');

    expect(await screen.findByText('Read handbook')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ravi Recruit' })).toBeInTheDocument();
    expect(api.listRecruitEntries).toHaveBeenCalledWith(7, 'tasks', {
      status: 'TODO',
      page: 0,
      size: 20,
    });
    expect(screen.queryByRole('button', { name: /new task/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('labels the notes tab as shared notes only', async () => {
    api.listRecruitEntries.mockResolvedValue(page([]));

    renderAt('/team/7/notes');

    expect(await screen.findByText('No notes have been shared with you.')).toBeInTheDocument();
    expect(
      screen.getByText('Only notes the recruit chose to share are shown.'),
    ).toBeInTheDocument();
    expect(api.listRecruitEntries).toHaveBeenCalledWith(7, 'notes', { page: 0, size: 20 });
  });

  it('shows the server message when the recruit is not assigned', async () => {
    api.fetchRecruit.mockRejectedValue(new Error('nope'));
    renderAt('/team/9');
    expect(await screen.findByText('Could not load this recruit')).toBeInTheDocument();
  });
});
