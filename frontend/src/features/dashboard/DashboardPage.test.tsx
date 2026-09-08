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
              recentTasks: [],
            }
      )
    )
  );

  renderWithProviders(<DashboardPage />);

  expect(await screen.findByRole('link', { name: 'Log your first task' })).toBeInTheDocument();
});
