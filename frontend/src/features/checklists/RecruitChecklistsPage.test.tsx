import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { renderWithProviders } from '../../test/renderWithProviders';
import { RecruitChecklistsPage } from './RecruitChecklistsPage';

const recruit = {
  id: 9,
  email: 'recruit@example.com',
  fullName: 'Rae Recruit',
  role: 'Recruit',
  departmentId: 2,
  departmentName: 'Engineering',
  startDate: '2026-01-05',
};

const available = [
  {
    templateId: 3,
    name: 'Engineering week one',
    description: null,
    itemCount: 2,
    applied: false,
    assignmentId: null,
    items: [
      {
        id: 11,
        position: 0,
        title: 'Collect laptop',
        description: null,
        category: 'Setup',
        dueOffsetDays: 0,
      },
    ],
  },
  {
    templateId: 4,
    name: 'Security induction',
    description: null,
    itemCount: 1,
    applied: true,
    assignmentId: 7,
    items: [],
  },
];

const progress = [
  {
    assignmentId: 7,
    templateId: 4,
    templateName: 'Security induction',
    appliedAt: '2026-01-05T09:00:00Z',
    generatedTasks: 2,
    completedTasks: 1,
    completionPercentage: 50,
  },
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockApi() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);

    if (url.endsWith('/me')) {
      return Promise.resolve(json(recruit));
    }
    if (url.includes('/checklist-templates/available')) {
      return Promise.resolve(json(available));
    }
    if (url.includes('/checklists/progress')) {
      return Promise.resolve(json(progress));
    }
    if (url.includes('/checklists/apply')) {
      return Promise.resolve(json({ progress: progress[0], tasks: [] }, 201));
    }
    return Promise.resolve(json({}, init?.method === 'POST' ? 201 : 200));
  });
}

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
  sessionStorage.setItem('onboarding-diary.access-token', 'token-123');
});

afterEach(() => sessionStorage.clear());

test('shows applied progress and marks templates already applied', async () => {
  mockApi();

  renderWithProviders(<RecruitChecklistsPage />);

  expect(await screen.findByText('1 of 2 tasks done · 50%')).toBeInTheDocument();
  expect(
    screen.getByRole('progressbar', { name: 'Security induction completion' })
  ).toHaveAttribute('aria-valuenow', '50');
  expect(screen.getByRole('button', { name: 'Already applied' })).toBeDisabled();
});

test('applies a template to the signed-in recruit', async () => {
  const user = userEvent.setup();
  const fetchMock = mockApi();

  renderWithProviders(<RecruitChecklistsPage />);
  await user.click(await screen.findByRole('button', { name: 'Apply checklist' }));

  await waitFor(() => {
    const apply = fetchMock.mock.calls.find(([input]) =>
      String(input).includes('/checklists/apply')
    );
    expect(JSON.parse(String(apply?.[1]?.body))).toEqual({ templateId: 3 });
  });
});
