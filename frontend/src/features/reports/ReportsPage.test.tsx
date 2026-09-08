import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { renderWithProviders } from '../../test/renderWithProviders';
import { ReportsPage } from './ReportsPage';

const recruitProfile = {
  id: 9,
  email: 'recruit@example.com',
  fullName: 'Rae Recruit',
  role: 'Recruit',
  departmentId: 1,
  departmentName: 'Engineering',
  startDate: '2026-01-05',
};

const managerProfile = { ...recruitProfile, id: 5, fullName: 'Mia Manager', role: 'Manager' };

const report = {
  header: {
    userId: 9,
    fullName: 'Rae Recruit',
    email: 'recruit@example.com',
    departmentName: 'Engineering',
    startDate: '2026-01-05',
    from: '2026-01-01',
    to: '2026-01-31',
    generatedAt: '2026-02-01T09:00:00Z',
  },
  summary: {
    totalTasks: 1,
    completedTasks: 1,
    openIssues: 0,
    resolvedIssues: 0,
    feedbackCount: 0,
    noteCount: 0,
  },
  sections: ['Tasks', 'Issues', 'Feedback', 'Notes'],
  tasks: [
    {
      id: 1,
      userId: 9,
      entryDate: '2026-01-09',
      title: 'Read the handbook',
      description: 'Went through the onboarding handbook end to end.',
      category: 'Training',
      status: 'Done',
      priority: 'High',
      createdAt: '2026-01-09T09:00:00Z',
      updatedAt: '2026-01-09T09:00:00Z',
    },
  ],
  issues: [],
  feedback: [],
  notes: [],
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockApi(profile: unknown = recruitProfile) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = String(input);

    if (url.endsWith('/me')) {
      return Promise.resolve(json(profile));
    }
    if (url.includes('/reports/download')) {
      return Promise.resolve(
        new Response('Section,Date\n', {
          status: 200,
          headers: {
            'content-type': 'text/csv',
            'content-disposition': 'attachment; filename="rae-recruit-2026-01-01-2026-01-31.csv"',
          },
        })
      );
    }
    if (url.includes('/reports/preview')) {
      return Promise.resolve(json(report));
    }
    if (url.includes('/team/recruits')) {
      return Promise.resolve(
        json({
          items: [{ userId: 9, fullName: 'Rae Recruit', email: 'recruit@example.com' }],
          page: 1,
          pageSize: 100,
          total: 1,
        })
      );
    }
    return Promise.resolve(json({}));
  });
}

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
  sessionStorage.setItem('onboarding-diary.access-token', 'token-123');
});

afterEach(() => sessionStorage.clear());

test('previews the signed-in recruit report without a recruit picker', async () => {
  const fetchMock = mockApi();
  renderWithProviders(<ReportsPage />);

  expect(await screen.findByText('Read the handbook')).toBeInTheDocument();
  expect(screen.getByText('Went through the onboarding handbook end to end.')).toBeInTheDocument();
  expect(screen.queryByLabelText('Recruit')).not.toBeInTheDocument();

  const preview = fetchMock.mock.calls
    .map(([input]) => String(input))
    .find((url) => url.includes('/reports/preview'))!;
  expect(preview).not.toContain('userId=');
  expect(preview).toContain('sections=Tasks&sections=Issues&sections=Feedback&sections=Notes');
});

test('drops a deselected section from the request', async () => {
  const fetchMock = mockApi();
  renderWithProviders(<ReportsPage />);

  await screen.findByText('Read the handbook');
  await userEvent.click(screen.getByRole('checkbox', { name: 'Notes' }));

  await waitFor(() => {
    const last = fetchMock.mock.calls
      .map(([input]) => String(input))
      .filter((url) => url.includes('/reports/preview'))
      .at(-1)!;
    expect(last).not.toContain('sections=Notes');
    expect(last).toContain('sections=Tasks');
  });
});

test('a manager must choose a recruit before a report is built', async () => {
  const fetchMock = mockApi(managerProfile);
  renderWithProviders(<ReportsPage />);

  expect(await screen.findByText('Select a recruit to preview their report.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Download CSV' })).toBeDisabled();
  expect(
    fetchMock.mock.calls.map(([input]) => String(input)).some((url) => url.includes('/reports/'))
  ).toBe(false);

  await userEvent.selectOptions(await screen.findByLabelText('Recruit'), '9');

  expect(await screen.findByText('Read the handbook')).toBeInTheDocument();
  expect(
    fetchMock.mock.calls
      .map(([input]) => String(input))
      .find((url) => url.includes('/reports/preview'))
  ).toContain('userId=9');
});

test('downloads the CSV with the filename the server sent', async () => {
  const fetchMock = mockApi();
  const createObjectURL = vi.fn(() => 'blob:report');
  const revokeObjectURL = vi.fn();
  Object.assign(URL, { createObjectURL, revokeObjectURL });
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

  renderWithProviders(<ReportsPage />);
  await screen.findByText('Read the handbook');
  await userEvent.click(screen.getByRole('button', { name: 'Download CSV' }));

  await waitFor(() => expect(click).toHaveBeenCalled());
  expect(createObjectURL).toHaveBeenCalled();
  expect(
    fetchMock.mock.calls.map(([input]) => String(input)).find((url) => url.includes('/download'))
  ).toContain('format=Csv');
});
