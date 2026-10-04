import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as managerApi from '../api/manager';
import * as reportsApi from '../api/reports';
import { fakeAuth, renderWithProviders } from '../test/renderWithProviders';
import { recruit } from '../test/fixtures';
import { rangeError } from '../utils/reportRange';
import { ReportsPage } from './ReportsPage';

vi.mock('../api/reports', async (importOriginal) => ({
  ...(await importOriginal<typeof reportsApi>()),
  previewReport: vi.fn(),
  downloadReport: vi.fn(),
  saveBlob: vi.fn(),
}));
vi.mock('../api/manager', async (importOriginal) => ({
  ...(await importOriginal<typeof managerApi>()),
  fetchRecruits: vi.fn(),
}));

const api = vi.mocked(reportsApi);
const manager = vi.mocked(managerApi);

function renderAs(roles: ('RECRUIT' | 'MANAGER' | 'ADMIN')[]) {
  return renderWithProviders(<ReportsPage />, {
    auth: fakeAuth({
      status: 'authenticated',
      user: { ...recruit, roles },
      hasRole: (...wanted) => wanted.some((role) => roles.includes(role)),
    }),
  });
}

describe('ReportsPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('previews a recruit report with counts and rows', async () => {
    api.previewReport.mockResolvedValue({
      type: 'COMBINED',
      scope: 'SELF',
      from: '2026-01-01',
      to: '2026-01-30',
      subjects: [{ id: 1, fullName: 'Ravi', email: 'r@x.com' }],
      counts: { TASK: 2, ISSUE: 1, FEEDBACK: 0 },
      totalRows: 3,
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'title', label: 'Title' },
      ],
      rows: [['2026-01-02', 'Laptop setup']],
    });
    renderAs(['RECRUIT']);

    expect(screen.queryByLabelText('Scope')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /preview/i }));

    expect(await screen.findByText('Laptop setup')).toBeInTheDocument();
    expect(screen.getByText('Task: 2')).toBeInTheDocument();
    expect(screen.getByText('Showing 1 of 3 rows')).toBeInTheDocument();
    expect(api.previewReport).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'COMBINED', scope: 'SELF' }),
    );
  });

  it('downloads the chosen type and format', async () => {
    const blob = new Blob(['a,b']);
    api.downloadReport.mockResolvedValue({ blob, fileName: 'report.csv' });
    renderAs(['RECRUIT']);

    await userEvent.click(screen.getByLabelText('Tasks'));
    await userEvent.click(screen.getByLabelText('CSV'));
    await userEvent.click(screen.getByRole('button', { name: 'Download CSV' }));

    await waitFor(() => expect(api.saveBlob).toHaveBeenCalledWith(blob, 'report.csv'));
    expect(api.downloadReport.mock.calls[0][0]).toMatchObject({ type: 'TASKS', format: 'CSV' });
  });

  it('shows server errors', async () => {
    api.downloadReport.mockRejectedValue(new Error('x'));
    renderAs(['RECRUIT']);
    await userEvent.click(screen.getByRole('button', { name: 'Download PDF' }));
    expect(await screen.findByText('Could not generate the report')).toBeInTheDocument();
  });

  it('lets managers report on an assigned recruit', async () => {
    manager.fetchRecruits.mockResolvedValue([
      {
        id: 7,
        fullName: 'Ravi Recruit',
        email: 'ravi@example.com',
        jobTitle: null,
        department: 'Eng',
        startDate: '2026-01-01',
        enabled: true,
        totalTasks: 0,
        completedTasks: 0,
        completionPct: 0,
        openIssues: 0,
        highSeverityOpenIssues: 0,
        lastActivityAt: null,
        inactive: false,
        atRisk: false,
      },
    ]);
    api.previewReport.mockResolvedValue({
      type: 'COMBINED',
      scope: 'SELF',
      from: '',
      to: '',
      subjects: [],
      counts: {},
      totalRows: 0,
      columns: [],
      rows: [],
    });
    renderAs(['MANAGER']);

    await userEvent.click(screen.getByLabelText('Scope'));
    const scopes = within(screen.getByRole('listbox'));
    expect(scopes.queryByText('All recruits')).not.toBeInTheDocument();
    await userEvent.click(scopes.getByText('One person'));
    await userEvent.click(screen.getByLabelText('Person'));
    await userEvent.click(await screen.findByRole('option', { name: 'Ravi Recruit' }));
    await userEvent.click(screen.getByRole('button', { name: /preview/i }));

    await waitFor(() =>
      expect(api.previewReport).toHaveBeenCalledWith(expect.objectContaining({ userId: 7 })),
    );
    expect(await screen.findByText('No entries in this period.')).toBeInTheDocument();
  });
});

describe('rangeError', () => {
  it('validates order and length', () => {
    expect(rangeError('2026-01-01', '2026-01-31')).toBeNull();
    expect(rangeError('2026-02-01', '2026-01-01')).toMatch(/must not be after/);
    expect(rangeError('2025-01-01', '2026-01-02')).toMatch(/at most 366 days/);
    expect(rangeError('', '2026-01-01')).toBe('Choose both dates');
  });
});
