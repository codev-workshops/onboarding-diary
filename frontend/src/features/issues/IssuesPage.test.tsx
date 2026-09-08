import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { renderWithProviders } from '../../test/renderWithProviders';
import { IssuesPage } from './IssuesPage';

const profile = {
  id: 1,
  email: 'recruit@example.com',
  fullName: 'Rae Recruit',
  role: 'Recruit',
  departmentId: null,
  departmentName: null,
  startDate: '2026-01-05',
};

const issue = {
  id: 3,
  userId: 1,
  entryDate: '2026-01-06',
  title: 'VPN access missing',
  description: 'Cannot reach the internal network.',
  severity: 'High',
  status: 'Open',
  resolutionNotes: null,
  resolvedAt: null,
  createdAt: '2026-01-06T09:00:00Z',
  updatedAt: '2026-01-06T09:00:00Z',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockApi(items: unknown[] = [issue]) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.endsWith('/me')) {
      return Promise.resolve(json(profile));
    }
    if (url.includes('/issues') && method === 'GET') {
      return Promise.resolve(json({ items, page: 1, pageSize: 10, total: items.length }));
    }
    if (method === 'DELETE') {
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    return Promise.resolve(json(issue, method === 'POST' ? 201 : 200));
  });
}

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
  sessionStorage.setItem('onboarding-diary.access-token', 'token-123');
});

afterEach(() => sessionStorage.clear());

test('lists issues with their severity', async () => {
  mockApi();

  renderWithProviders(<IssuesPage />);

  const entry = (await screen.findByText('VPN access missing')).closest('li');
  expect(entry).not.toBeNull();
  expect(within(entry as HTMLElement).getByText('High')).toBeInTheDocument();
});

test('sends the severity and status filters to the API', async () => {
  const user = userEvent.setup();
  const fetchMock = mockApi();

  renderWithProviders(<IssuesPage />);
  await user.selectOptions(await screen.findByLabelText('Severity'), 'Critical');
  await user.selectOptions(screen.getByLabelText('Status'), 'Resolved');

  await waitFor(() => {
    const urls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(
      urls.some((url) => url.includes('severity=Critical') && url.includes('status=Resolved'))
    ).toBe(true);
  });
});

test('creates an issue without asking for a status', async () => {
  const user = userEvent.setup();
  const fetchMock = mockApi([]);

  renderWithProviders(<IssuesPage />);
  await user.click(await screen.findByRole('button', { name: 'New issue' }));

  const dialog = screen.getByRole('dialog');
  await user.type(within(dialog).getByLabelText('Title'), 'Laptop overheats');
  await user.selectOptions(within(dialog).getByLabelText('Severity'), 'Critical');
  expect(within(dialog).getByLabelText('Status')).toBeDisabled();
  await user.click(within(dialog).getByRole('button', { name: 'Save issue' }));

  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
  expect(JSON.parse(String(post?.[1]?.body))).toEqual({
    entryDate: expect.any(String),
    title: 'Laptop overheats',
    description: null,
    severity: 'Critical',
  });
});

test('only offers the statuses reachable from the current one', async () => {
  const user = userEvent.setup();
  mockApi([{ ...issue, status: 'Closed' }]);

  renderWithProviders(<IssuesPage />);
  await user.click(await screen.findByRole('button', { name: 'Edit' }));

  const statuses = within(screen.getByRole('dialog'))
    .getAllByRole('option')
    .map((option) => option.textContent);

  expect(statuses).toContain('Closed');
  expect(statuses).toContain('Open');
  expect(statuses).not.toContain('In progress');
});

test('requires resolution notes before resolving an issue', async () => {
  const user = userEvent.setup();
  const fetchMock = mockApi();

  renderWithProviders(<IssuesPage />);
  await user.click(await screen.findByRole('button', { name: 'Edit' }));

  const dialog = screen.getByRole('dialog');
  await user.selectOptions(within(dialog).getByLabelText('Status'), 'Resolved');
  await user.click(within(dialog).getByRole('button', { name: 'Save issue' }));

  expect(await within(dialog).findByRole('alert')).toHaveTextContent(
    'Resolution notes are required when an issue is resolved or closed.'
  );
  expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false);

  await user.type(within(dialog).getByLabelText('Resolution notes'), 'IT granted access.');
  await user.click(within(dialog).getByRole('button', { name: 'Save issue' }));

  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
  expect(JSON.parse(String(patch?.[1]?.body))).toMatchObject({
    status: 'Resolved',
    resolutionNotes: 'IT granted access.',
  });
});

test('asks for confirmation before deleting', async () => {
  const user = userEvent.setup();
  const fetchMock = mockApi();

  renderWithProviders(<IssuesPage />);
  await user.click(await screen.findByRole('button', { name: 'Delete' }));

  const confirm = screen.getByRole('dialog', { name: 'Confirm delete' });
  expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);

  await user.click(within(confirm).getByRole('button', { name: 'Delete' }));

  await waitFor(() =>
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(true)
  );
});

test('tells a manager that only recruits keep a diary', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) =>
    Promise.resolve(
      String(input).endsWith('/me') ? json({ ...profile, role: 'Manager' }) : json({})
    )
  );

  renderWithProviders(<IssuesPage />);

  expect(await screen.findByText(/Only recruits keep a diary/)).toBeInTheDocument();
});
