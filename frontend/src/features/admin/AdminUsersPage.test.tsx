import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { renderWithProviders } from '../../test/renderWithProviders';
import { AdminUsersPage } from './AdminUsersPage';

const admin = {
  id: 1,
  email: 'admin@example.com',
  fullName: 'Ada Admin',
  role: 'Admin',
  departmentId: null,
  departmentName: null,
  startDate: null,
};

const managerRow = {
  id: 5,
  email: 'manager@example.com',
  fullName: 'Mia Manager',
  role: 'Manager',
  departmentId: 2,
  departmentName: 'Engineering',
  managerId: null,
  managerName: null,
  startDate: null,
  isActive: true,
  createdAt: '2026-01-01T09:00:00Z',
};

const recruitRow = {
  ...managerRow,
  id: 9,
  email: 'recruit@example.com',
  fullName: 'Rae Recruit',
  role: 'Recruit',
  managerId: 5,
  managerName: 'Mia Manager',
  startDate: '2026-01-05',
};

const stats = {
  totalUsers: 3,
  activeUsers: 3,
  recruits: 1,
  managers: 1,
  admins: 1,
  unassignedRecruits: 0,
  taskCount: 4,
  openIssueCount: 1,
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockApi(items: unknown[] = [managerRow, recruitRow]) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.endsWith('/me')) {
      return Promise.resolve(json(admin));
    }
    if (url.includes('/admin/stats')) {
      return Promise.resolve(json(stats));
    }
    if (url.includes('/departments')) {
      return Promise.resolve(json([{ id: 2, name: 'Engineering', isActive: true }]));
    }
    if (url.includes('/admin/users') && method === 'GET') {
      const list = url.includes('role=Manager') ? [managerRow] : items;
      return Promise.resolve(json({ items: list, page: 1, pageSize: 10, total: list.length }));
    }
    return Promise.resolve(json(recruitRow, method === 'POST' ? 201 : 200));
  });
}

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
  sessionStorage.setItem('onboarding-diary.access-token', 'token-123');
});

afterEach(() => sessionStorage.clear());

test('lists users with their role and manager assignment', async () => {
  mockApi();

  renderWithProviders(<AdminUsersPage />);

  expect(await screen.findAllByText('Rae Recruit')).not.toHaveLength(0);
  const row = (await screen.findAllByText('recruit@example.com'))[0].closest('tr');
  expect(within(row as HTMLElement).getByText('Mia Manager')).toBeInTheDocument();
});

test('sends the role and status filters to the API', async () => {
  const user = userEvent.setup();
  const fetchMock = mockApi();

  renderWithProviders(<AdminUsersPage />);
  await user.selectOptions(await screen.findByLabelText('Role'), 'Recruit');
  await user.selectOptions(screen.getByLabelText('Status'), 'false');

  await waitFor(() => {
    const urls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(urls.some((url) => url.includes('role=Recruit') && url.includes('isActive=false'))).toBe(
      true
    );
  });
});

test('creates a recruit with an initial password and a manager', async () => {
  const user = userEvent.setup();
  const fetchMock = mockApi([]);

  renderWithProviders(<AdminUsersPage />);
  await user.click(await screen.findByRole('button', { name: 'New user' }));

  const dialog = screen.getByRole('dialog');
  await user.type(within(dialog).getByLabelText('Email'), 'new@example.com');
  await user.type(within(dialog).getByLabelText('Initial password'), 'correct-horse-9');
  await user.type(within(dialog).getByLabelText('Full name'), 'Nia Newcomer');
  await user.selectOptions(within(dialog).getByLabelText('Manager'), '5');
  await user.click(within(dialog).getByRole('button', { name: 'Save user' }));

  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
  expect(JSON.parse(String(post?.[1]?.body))).toEqual({
    email: 'new@example.com',
    password: 'correct-horse-9',
    fullName: 'Nia Newcomer',
    role: 'Recruit',
    departmentId: null,
    managerId: 5,
    startDate: null,
  });
});

test('edits an existing user without asking for a password', async () => {
  const user = userEvent.setup();
  const fetchMock = mockApi();

  renderWithProviders(<AdminUsersPage />);
  await user.click((await screen.findAllByRole('button', { name: 'Edit' }))[0]);

  const dialog = screen.getByRole('dialog');
  expect(within(dialog).queryByLabelText('Initial password')).not.toBeInTheDocument();
  await user.click(within(dialog).getByLabelText(/Active/));
  await user.click(within(dialog).getByRole('button', { name: 'Save user' }));

  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
  expect(JSON.parse(String(patch?.[1]?.body))).toMatchObject({
    fullName: 'Mia Manager',
    role: 'Manager',
    managerId: null,
    isActive: false,
  });
});
