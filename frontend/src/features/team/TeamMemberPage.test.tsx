import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { renderWithProviders } from '../../test/renderWithProviders';
import { TeamMemberPage } from './TeamMemberPage';

const manager = {
  id: 5,
  email: 'manager@example.com',
  fullName: 'Mia Manager',
  role: 'Manager',
  departmentId: null,
  departmentName: null,
  startDate: null,
};

const member = {
  userId: 9,
  fullName: 'Rae Recruit',
  email: 'recruit@example.com',
  departmentName: 'Engineering',
  startDate: '2026-01-05',
  managerId: 5,
  managerName: 'Mia Manager',
  isActive: true,
  taskCount: 4,
  completionPercentage: 50,
  openIssueCount: 1,
  lastActivityAt: '2026-01-09T09:00:00Z',
};

const dashboard = {
  tasks: { total: 4, completionPercentage: 50, byStatus: {} },
  issues: { open: 1, openBySeverity: {} },
  feedbackCount: 2,
  noteCount: 3,
  recentTasks: [],
  recentActivity: [],
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockApi({ memberStatus = 200 }: { memberStatus?: number } = {}) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = String(input);

    if (url.endsWith('/me')) {
      return Promise.resolve(json(manager));
    }
    if (url.includes('/team/recruits/')) {
      return memberStatus === 200
        ? Promise.resolve(json(member))
        : Promise.resolve(json({ title: 'Not Found', status: memberStatus }, memberStatus));
    }
    if (url.includes('/checklists/progress')) {
      return Promise.resolve(
        json([
          {
            assignmentId: 7,
            templateId: 3,
            templateName: 'Engineering week one',
            appliedAt: '2026-01-05T09:00:00Z',
            generatedTasks: 4,
            completedTasks: 2,
            completionPercentage: 50,
          },
        ])
      );
    }
    if (url.includes('/dashboard')) {
      return Promise.resolve(json(dashboard));
    }
    if (url.includes('/tasks')) {
      return Promise.resolve(
        json({
          items: [
            {
              id: 1,
              userId: 9,
              entryDate: '2026-01-09',
              title: 'Set up laptop',
              description: 'Installed the toolchain and joined the VPN.',
              category: 'Setup',
              priority: 'Medium',
              status: 'Completed',
              createdAt: '2026-01-09T09:00:00Z',
              updatedAt: '2026-01-09T09:00:00Z',
            },
          ],
          page: 1,
          pageSize: 10,
          total: 1,
        })
      );
    }
    return Promise.resolve(json({ items: [], page: 1, pageSize: 10, total: 0 }));
  });
}

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/team/:userId" element={<TeamMemberPage />} />
    </Routes>,
    { route: '/team/9' }
  );
}

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
  sessionStorage.setItem('onboarding-diary.access-token', 'token-123');
});

afterEach(() => sessionStorage.clear());

test('shows the recruit summary and their tasks without write controls', async () => {
  mockApi();

  renderPage();

  expect(await screen.findByRole('heading', { name: 'Rae Recruit' })).toBeInTheDocument();
  expect(
    screen.getByText('Read-only view. Only the recruit can change their diary entries.')
  ).toBeInTheDocument();
  expect(await screen.findByText('Set up laptop')).toBeInTheDocument();
  expect(screen.getByText('Installed the toolchain and joined the VPN.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /new|edit|delete/i })).not.toBeInTheDocument();
});

test('scopes each diary tab to the recruit', async () => {
  const user = userEvent.setup();
  const fetchMock = mockApi();

  renderPage();
  await user.click(await screen.findByRole('tab', { name: 'Issues' }));

  const urls = fetchMock.mock.calls.map(([input]) => String(input));
  expect(urls.some((url) => url.includes('/issues') && url.includes('userId=9'))).toBe(true);
});

test('shows read-only checklist progress for the recruit', async () => {
  const user = userEvent.setup();
  const fetchMock = mockApi();

  renderPage();
  await user.click(await screen.findByRole('tab', { name: 'Checklists' }));

  expect(await screen.findByText('Engineering week one')).toBeInTheDocument();
  expect(screen.getByText('2 of 4 tasks done · 50%')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /apply/i })).not.toBeInTheDocument();

  const urls = fetchMock.mock.calls.map(([input]) => String(input));
  expect(urls.some((url) => url.includes('/checklists/progress?userId=9'))).toBe(true);
});

test('explains a recruit who is not assigned to the caller', async () => {
  mockApi({ memberStatus: 404 });

  renderPage();

  expect(await screen.findByText('That recruit is not assigned to you.')).toBeInTheDocument();
});
