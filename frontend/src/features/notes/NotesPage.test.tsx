import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { renderWithProviders } from '../../test/renderWithProviders';
import { NotesPage } from './NotesPage';

const profile = {
  id: 1,
  email: 'recruit@example.com',
  fullName: 'Rae Recruit',
  role: 'Recruit',
  departmentId: null,
  departmentName: null,
  startDate: '2026-01-05',
};

const note = {
  id: 21,
  userId: 1,
  entryDate: '2026-01-08',
  title: 'Deployment walkthrough',
  content: 'Releases go out through the pipeline every Thursday.',
  tags: ['deployment', 'process'],
  createdAt: '2026-01-08T09:00:00Z',
  updatedAt: '2026-01-08T09:00:00Z',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockApi(items: unknown[] = [note]) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.endsWith('/me')) {
      return Promise.resolve(json(profile));
    }
    if (url.includes('/notes') && method === 'GET') {
      return Promise.resolve(json({ items, page: 1, pageSize: 10, total: items.length }));
    }
    return Promise.resolve(json(note, method === 'POST' ? 201 : 200));
  });
}

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
  sessionStorage.setItem('onboarding-diary.access-token', 'token-123');
});

afterEach(() => sessionStorage.clear());

test('lists notes with their tag chips', async () => {
  mockApi();

  renderWithProviders(<NotesPage />);

  expect(await screen.findByText('Deployment walkthrough')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '#deployment' })).toBeInTheDocument();
});

test('filters by tag when a chip is clicked', async () => {
  const user = userEvent.setup();
  const fetchMock = mockApi();

  renderWithProviders(<NotesPage />);
  await user.click(await screen.findByRole('button', { name: '#process' }));

  await waitFor(() =>
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('tag=process'))).toBe(true)
  );
  expect(screen.getByLabelText('Tag')).toHaveValue('process');
});

test('searches the note content', async () => {
  const user = userEvent.setup();
  const fetchMock = mockApi();

  renderWithProviders(<NotesPage />);
  await user.type(await screen.findByLabelText('Search'), 'pipeline');

  await waitFor(() =>
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('q=pipeline'))).toBe(true)
  );
});

test('normalises and de-duplicates the tags it sends', async () => {
  const user = userEvent.setup();
  const fetchMock = mockApi([]);

  renderWithProviders(<NotesPage />);
  await user.click(await screen.findByRole('button', { name: 'New note' }));

  const dialog = screen.getByRole('dialog');
  await user.type(within(dialog).getByLabelText('Title'), 'Standup notes');
  await user.type(within(dialog).getByLabelText('Content'), 'Daily standup is at 9:30.');
  await user.type(
    within(dialog).getByLabelText('Tags (comma separated)'),
    ' Process , process, RITUALS '
  );

  const preview = within(dialog).getByRole('list', { name: 'Tag preview' });
  expect(
    within(preview)
      .getAllByRole('listitem')
      .map((item) => item.textContent)
  ).toEqual(['process', 'rituals']);

  await user.click(within(dialog).getByRole('button', { name: 'Save note' }));

  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
  expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({
    title: 'Standup notes',
    tags: ['process', 'rituals'],
  });
});
