import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { renderWithProviders } from '../../test/renderWithProviders';
import { FeedbackPage } from './FeedbackPage';

const profile = {
  id: 1,
  email: 'recruit@example.com',
  fullName: 'Rae Recruit',
  role: 'Recruit',
  departmentId: null,
  departmentName: null,
  startDate: '2026-01-05',
};

const feedback = {
  id: 11,
  userId: 1,
  entryDate: '2026-01-07',
  title: 'Buddy system works',
  message: 'Pairing with my buddy shortened the setup a lot.',
  type: 'Positive',
  createdAt: '2026-01-07T09:00:00Z',
  updatedAt: '2026-01-07T09:00:00Z',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockApi(items: unknown[] = [feedback]) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = String(input);
    const method = init?.method ?? 'GET';

    if (url.endsWith('/me')) {
      return Promise.resolve(json(profile));
    }
    if (url.includes('/feedback') && method === 'GET') {
      return Promise.resolve(json({ items, page: 1, pageSize: 10, total: items.length }));
    }
    return Promise.resolve(json(feedback, method === 'POST' ? 201 : 200));
  });
}

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
  sessionStorage.setItem('onboarding-diary.access-token', 'token-123');
});

afterEach(() => sessionStorage.clear());

test('lists feedback with its type', async () => {
  mockApi();

  renderWithProviders(<FeedbackPage />);

  const entry = (await screen.findByText('Buddy system works')).closest('li');
  expect(entry).not.toBeNull();
  expect(within(entry as HTMLElement).getByText('Positive')).toBeInTheDocument();
});

test('filters by type', async () => {
  const user = userEvent.setup();
  const fetchMock = mockApi();

  renderWithProviders(<FeedbackPage />);
  await user.selectOptions(await screen.findByLabelText('Type'), 'Concern');

  await waitFor(() =>
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('type=Concern'))).toBe(
      true
    )
  );
});

test('creates attributed feedback', async () => {
  const user = userEvent.setup();
  const fetchMock = mockApi([]);

  renderWithProviders(<FeedbackPage />);
  await user.click(await screen.findByRole('button', { name: 'New feedback' }));

  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText(/no anonymous option/)).toBeInTheDocument();
  await user.type(within(dialog).getByLabelText('Title'), 'Induction pace');
  await user.type(within(dialog).getByLabelText('Message'), 'The first week felt rushed.');
  await user.selectOptions(within(dialog).getByLabelText('Type'), 'Concern');
  await user.click(within(dialog).getByRole('button', { name: 'Save feedback' }));

  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
  expect(JSON.parse(String(post?.[1]?.body))).toMatchObject({
    title: 'Induction pace',
    message: 'The first week felt rushed.',
    type: 'Concern',
  });
});

test('validates the message before calling the API', async () => {
  const user = userEvent.setup();
  const fetchMock = mockApi([]);

  renderWithProviders(<FeedbackPage />);
  await user.click(await screen.findByRole('button', { name: 'New feedback' }));

  const dialog = screen.getByRole('dialog');
  await user.type(within(dialog).getByLabelText('Title'), 'Too short');
  await user.click(within(dialog).getByRole('button', { name: 'Save feedback' }));

  expect(await within(dialog).findByRole('alert')).toHaveTextContent(
    'Say a little more — at least 3 characters.'
  );
  expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false);
});
