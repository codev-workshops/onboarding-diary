import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { renderWithProviders } from '../../test/renderWithProviders';
import { ChecklistTemplatesPage } from './ChecklistTemplatesPage';

const admin = {
  id: 1,
  email: 'admin@example.com',
  fullName: 'Ada Admin',
  role: 'Admin',
  departmentId: null,
  departmentName: null,
  startDate: null,
};

const manager = { ...admin, id: 5, email: 'manager@example.com', role: 'Manager' };

const template = {
  id: 3,
  name: 'Engineering week one',
  description: 'First week for engineers',
  departmentId: 2,
  departmentName: 'Engineering',
  isActive: true,
  itemCount: 2,
  assignmentCount: 1,
  createdAt: '2026-01-01T09:00:00Z',
  updatedAt: '2026-01-01T09:00:00Z',
  items: [
    {
      id: 11,
      position: 0,
      title: 'Collect laptop',
      description: null,
      category: 'Setup',
      dueOffsetDays: 0,
    },
    {
      id: 12,
      position: 1,
      title: 'Meet the team',
      description: null,
      category: 'Meeting',
      dueOffsetDays: 1,
    },
  ],
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockApi(profile: unknown = admin) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.endsWith('/me')) {
      return Promise.resolve(json(profile));
    }
    if (url.includes('/departments')) {
      return Promise.resolve(json([{ id: 2, name: 'Engineering', isActive: true }]));
    }
    if (url.includes('/checklist-templates') && method === 'GET') {
      return Promise.resolve(json({ items: [template], page: 1, pageSize: 10, total: 1 }));
    }
    return Promise.resolve(json(template, method === 'POST' ? 201 : 200));
  });
}

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
  sessionStorage.setItem('onboarding-diary.access-token', 'token-123');
});

afterEach(() => sessionStorage.clear());

test('lists templates with their ordered items', async () => {
  mockApi();

  renderWithProviders(<ChecklistTemplatesPage />);

  expect(await screen.findByText('Engineering week one')).toBeInTheDocument();
  const items = screen.getAllByRole('listitem').filter((item) => item.tagName === 'LI');
  expect(items.map((item) => item.textContent).join('|')).toContain('Collect laptop');
  expect(screen.getByText(/Engineering · 2 items · Active/)).toBeInTheDocument();
});

test('hides the admin controls from a manager', async () => {
  mockApi(manager);

  renderWithProviders(<ChecklistTemplatesPage />);

  expect(await screen.findByText('Engineering week one')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'New template' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
});

test('creates a template with reordered items', async () => {
  const user = userEvent.setup();
  const fetchMock = mockApi();

  renderWithProviders(<ChecklistTemplatesPage />);
  await user.click(await screen.findByRole('button', { name: 'New template' }));

  const dialog = screen.getByRole('dialog');
  await user.type(within(dialog).getByLabelText('Name'), 'Sales week one');
  await user.type(within(dialog).getByLabelText('Title'), 'Read the handbook');

  await user.click(within(dialog).getByRole('button', { name: 'Add item' }));
  await user.type(
    within(dialog).getByLabelText(/^Title$/, { selector: '#item-1-title' }),
    'Shadow a call'
  );
  await user.click(within(dialog).getByRole('button', { name: 'Move item 2 up' }));
  await user.click(within(dialog).getByRole('button', { name: 'Save template' }));

  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
  const body = JSON.parse(String(post?.[1]?.body));
  expect(body.name).toBe('Sales week one');
  expect(body.items.map((item: { title: string }) => item.title)).toEqual([
    'Shadow a call',
    'Read the handbook',
  ]);
});

test('sends the full ordered item list when editing', async () => {
  const user = userEvent.setup();
  const fetchMock = mockApi();

  renderWithProviders(<ChecklistTemplatesPage />);
  await user.click(await screen.findByRole('button', { name: 'Edit' }));

  const dialog = screen.getByRole('dialog');
  await user.click(within(dialog).getByRole('button', { name: 'Remove item 1' }));
  await user.click(within(dialog).getByRole('button', { name: 'Save template' }));

  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  const put = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT');
  expect(String(put?.[0])).toContain('/checklist-templates/3');
  expect(JSON.parse(String(put?.[1]?.body)).items).toEqual([
    { title: 'Meet the team', description: null, category: 'Meeting', dueOffsetDays: 1 },
  ]);
});
