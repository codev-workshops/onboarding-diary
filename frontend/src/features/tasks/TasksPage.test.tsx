import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { renderWithProviders } from '../../test/renderWithProviders';
import { TasksPage } from './TasksPage';

const profile = {
  id: 1,
  email: 'recruit@example.com',
  fullName: 'Rae Recruit',
  role: 'Recruit',
  departmentId: null,
  departmentName: null,
  startDate: '2026-01-05',
};

const task = {
  id: 7,
  userId: 1,
  entryDate: '2026-01-06',
  title: 'Set up laptop',
  description: null,
  category: 'Setup',
  status: 'Todo',
  priority: 'Medium',
  createdAt: '2026-01-06T09:00:00Z',
  updatedAt: '2026-01-06T09:00:00Z',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** Serves `/me` plus a task list, and records every other call for assertions. */
function mockApi(items: unknown[] = [task]) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.endsWith('/me')) {
      return Promise.resolve(json(profile));
    }
    if (url.includes('/tasks') && method === 'GET') {
      return Promise.resolve(json({ items, page: 1, pageSize: 10, total: items.length }));
    }
    if (method === 'DELETE') {
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    return Promise.resolve(json(task, method === 'POST' ? 201 : 200));
  });
}

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
  sessionStorage.setItem('onboarding-diary.access-token', 'token-123');
});

afterEach(() => sessionStorage.clear());

test('lists the recruit tasks', async () => {
  mockApi();

  renderWithProviders(<TasksPage />);

  expect(await screen.findAllByText('Set up laptop')).not.toHaveLength(0);
});

test('shows an empty state when there are no tasks', async () => {
  mockApi([]);

  renderWithProviders(<TasksPage />);

  expect(await screen.findByText('No tasks yet.')).toBeInTheDocument();
});

test('validates the title before calling the API', async () => {
  const user = userEvent.setup();
  const fetchMock = mockApi();

  renderWithProviders(<TasksPage />);
  await user.click(await screen.findByRole('button', { name: 'New task' }));

  const dialog = screen.getByRole('dialog');
  await user.type(within(dialog).getByLabelText('Title'), 'no');
  await user.click(within(dialog).getByRole('button', { name: 'Save task' }));

  expect(await within(dialog).findByRole('alert')).toHaveTextContent(
    'Title must be at least 3 characters.'
  );
  expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
});

test('creates a task', async () => {
  const user = userEvent.setup();
  const fetchMock = mockApi();

  renderWithProviders(<TasksPage />);
  await user.click(await screen.findByRole('button', { name: 'New task' }));

  const dialog = screen.getByRole('dialog');
  await user.type(within(dialog).getByLabelText('Title'), 'Read the handbook');
  await user.click(within(dialog).getByRole('button', { name: 'Save task' }));

  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

  const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
  expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({
    title: 'Read the handbook',
    status: 'Todo',
  });
});

test('shows the per-field message when the API rejects the entry date', async () => {
  const user = userEvent.setup();
  vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    if (url.endsWith('/me')) {
      return Promise.resolve(json(profile));
    }
    if ((init?.method ?? 'GET') === 'GET') {
      return Promise.resolve(json({ items: [], page: 1, pageSize: 10, total: 0 }));
    }
    return Promise.resolve(
      json(
        {
          title: 'One or more validation errors occurred.',
          status: 400,
          errors: { EntryDate: ['The entry date cannot be in the future.'] },
        },
        400
      )
    );
  });

  renderWithProviders(<TasksPage />);
  await user.click(await screen.findByRole('button', { name: 'New task' }));

  const dialog = screen.getByRole('dialog');
  await user.type(within(dialog).getByLabelText('Title'), 'Tomorrow work');
  await user.click(within(dialog).getByRole('button', { name: 'Save task' }));

  expect(await within(dialog).findByRole('alert')).toHaveTextContent(
    'The entry date cannot be in the future.'
  );
});

test('changes a task status from the list', async () => {
  const user = userEvent.setup();
  const fetchMock = mockApi();

  renderWithProviders(<TasksPage />);

  const [statusSelect] = await screen.findAllByLabelText('Status for Set up laptop');
  await user.selectOptions(statusSelect, 'Done');

  await waitFor(() =>
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(true)
  );
  const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH');
  expect(JSON.parse(String(patch?.[1]?.body))).toMatchObject({ status: 'Done' });
});

test('asks for confirmation before deleting', async () => {
  const user = userEvent.setup();
  const fetchMock = mockApi();

  renderWithProviders(<TasksPage />);

  const [deleteButton] = await screen.findAllByRole('button', { name: 'Delete' });
  await user.click(deleteButton);

  const confirm = screen.getByRole('dialog', { name: 'Confirm delete' });
  expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);

  await user.click(within(confirm).getByRole('button', { name: 'Delete' }));

  await waitFor(() =>
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(true)
  );
});

test('tells a manager that only recruits keep a task log', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) =>
    Promise.resolve(
      String(input).endsWith('/me') ? json({ ...profile, role: 'Manager' }) : json({})
    )
  );

  renderWithProviders(<TasksPage />);

  expect(await screen.findByText(/Only recruits keep a task log/)).toBeInTheDocument();
});
