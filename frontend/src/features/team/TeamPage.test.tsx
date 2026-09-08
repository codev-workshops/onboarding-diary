import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { renderWithProviders } from '../../test/renderWithProviders';
import { TeamPage } from './TeamPage';

const manager = {
  id: 5,
  email: 'manager@example.com',
  fullName: 'Mia Manager',
  role: 'Manager',
  departmentId: null,
  departmentName: null,
  startDate: null,
};

const recruit = {
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockApi(items: unknown[] = [recruit], profile: unknown = manager) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = String(input);

    if (url.endsWith('/me')) {
      return Promise.resolve(json(profile));
    }
    if (url.includes('/team/recruits')) {
      return Promise.resolve(json({ items, page: 1, pageSize: 10, total: items.length }));
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

test('lists assigned recruits with their progress', async () => {
  mockApi();

  renderWithProviders(<TeamPage />);

  expect((await screen.findAllByRole('link', { name: 'Rae Recruit' }))[0]).toHaveAttribute(
    'href',
    '/team/9'
  );
  expect(
    screen.getByText('Recruits assigned to you. Diary entries are read-only.')
  ).toBeInTheDocument();
  expect(screen.getAllByText('50%')[0]).toBeInTheDocument();
});

test('tells an admin the roster covers the whole organisation', async () => {
  mockApi([recruit], { ...manager, role: 'Admin' });

  renderWithProviders(<TeamPage />);

  expect(
    await screen.findByText('Every recruit in the organisation. Diary entries are read-only.')
  ).toBeInTheDocument();
});

test('sends the search term to the API', async () => {
  const user = userEvent.setup();
  const fetchMock = mockApi();

  renderWithProviders(<TeamPage />);
  await user.type(await screen.findByLabelText('Search'), 'rae');

  await waitFor(() => {
    const urls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(urls.some((url) => url.includes('q=rae'))).toBe(true);
  });
});

test('shows an empty state when nobody is assigned', async () => {
  mockApi([]);

  renderWithProviders(<TeamPage />);

  expect(await screen.findByText('No recruits assigned yet.')).toBeInTheDocument();
});
