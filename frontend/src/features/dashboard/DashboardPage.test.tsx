import { screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { renderWithProviders } from '../../test/renderWithProviders';
import { DashboardPage } from './DashboardPage';

const profile = {
  id: 1,
  email: 'recruit@example.com',
  fullName: 'Rae Recruit',
  role: 'Recruit',
  departmentId: null,
  departmentName: null,
  startDate: '2026-01-05',
};

const summary = {
  userId: 1,
  tasks: { total: 4, done: 1, open: 3, completionPercentage: 25 },
  issues: { total: 3, open: 2, openBySeverity: { High: 1, Critical: 1, Low: 0 } },
  feedbackCount: 2,
  noteCount: 5,
  recentTasks: [
    {
      id: 7,
      userId: 1,
      entryDate: '2026-01-06',
      title: 'Set up laptop',
      description: null,
      category: 'Setup',
      status: 'InProgress',
      priority: 'Medium',
      createdAt: '2026-01-06T09:00:00Z',
      updatedAt: '2026-01-06T09:00:00Z',
    },
  ],
  recentActivity: [
    {
      kind: 'Issue',
      id: 3,
      entryDate: '2026-01-07',
      title: 'VPN access missing',
      detail: 'High · Open',
      updatedAt: '2026-01-07T09:00:00Z',
    },
  ],
};

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
  sessionStorage.setItem('onboarding-diary.access-token', 'token-123');
});

afterEach(() => sessionStorage.clear());

test('shows the task completion summary and recent activity', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) =>
    Promise.resolve(json(String(input).endsWith('/me') ? profile : summary))
  );

  renderWithProviders(<DashboardPage />);

  expect(await screen.findByText('25%')).toBeInTheDocument();
  expect(screen.getByText('Tasks logged').nextElementSibling).toHaveTextContent('4');
  expect(screen.getByText(/In progress/)).toBeInTheDocument();
  expect(screen.getByText('Open issues').nextElementSibling).toHaveTextContent('2');
  expect(screen.getByText('Feedback').nextElementSibling).toHaveTextContent('2');
  expect(screen.getByText('Notes').nextElementSibling).toHaveTextContent('5');
  expect(screen.getByText('High: 1')).toBeInTheDocument();
  expect(screen.queryByText('Low: 0')).not.toBeInTheDocument();
  expect(screen.getByText('VPN access missing')).toBeInTheDocument();
});

test('prompts an empty recruit to log a first task', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) =>
    Promise.resolve(
      json(
        String(input).endsWith('/me')
          ? profile
          : {
              userId: 1,
              tasks: { total: 0, done: 0, open: 0, completionPercentage: 0 },
              issues: { total: 0, open: 0, openBySeverity: {} },
              feedbackCount: 0,
              noteCount: 0,
              recentTasks: [],
              recentActivity: [],
            }
      )
    )
  );

  renderWithProviders(<DashboardPage />);

  expect(await screen.findByRole('link', { name: 'Log your first task' })).toBeInTheDocument();
});
