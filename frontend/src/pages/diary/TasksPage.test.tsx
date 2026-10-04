import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import * as diaryApi from '../../api/diary';
import { fakeAuth, renderWithProviders } from '../../test/renderWithProviders';
import { page, recruit, task } from '../../test/fixtures';
import { todayIso } from '../../utils/dates';
import { TasksPage } from './TasksPage';

vi.mock('../../api/diary', async (importOriginal) => ({
  ...(await importOriginal<typeof diaryApi>()),
  listEntries: vi.fn(),
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
  deleteEntry: vi.fn(),
  changeTaskStatus: vi.fn(),
}));

const api = vi.mocked(diaryApi);

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.search}</div>;
}

function renderPage(route = '/tasks') {
  return renderWithProviders(
    <>
      <TasksPage />
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </>,
    { auth: fakeAuth({ status: 'authenticated', user: recruit }), route, path: '/tasks' },
  );
}

describe('TasksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listEntries.mockResolvedValue(page([task()]));
  });

  it('loads tasks using filters and page from the URL', async () => {
    renderPage('/tasks?status=COMPLETED,BLOCKED&category=SETUP&page=2');

    expect(await screen.findByText('Set up laptop')).toBeInTheDocument();
    expect(api.listEntries).toHaveBeenCalledWith('tasks', {
      status: 'COMPLETED,BLOCKED',
      category: 'SETUP',
      page: 1,
      size: 20,
    });
  });

  it('writes filter changes to the URL and returns to the first page', async () => {
    renderPage('/tasks?page=3');
    await screen.findByText('Set up laptop');

    await userEvent.click(screen.getByRole('combobox', { name: 'Status' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Blocked' }));

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('?status=BLOCKED'),
    );
    expect(api.listEntries).toHaveBeenLastCalledWith('tasks', {
      status: 'BLOCKED',
      page: 0,
      size: 20,
    });
  });

  it('shows a helpful empty state', async () => {
    api.listEntries.mockResolvedValue(page([]));
    renderPage();
    expect(await screen.findByText(/No tasks yet/)).toBeInTheDocument();
  });

  it('shows an error when loading fails', async () => {
    api.listEntries.mockRejectedValue(new Error('boom'));
    renderPage();
    expect(await screen.findByText('Could not load tasks')).toBeInTheDocument();
  });

  it('validates and creates a task', async () => {
    api.createEntry.mockResolvedValue(task({ id: 2, title: 'Read handbook' }));
    renderPage();
    await screen.findByText('Set up laptop');

    await userEvent.click(screen.getByRole('button', { name: 'New task' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await within(dialog).findByText('Title is required')).toBeInTheDocument();
    expect(within(dialog).getByText('Category is required')).toBeInTheDocument();
    expect(api.createEntry).not.toHaveBeenCalled();

    await userEvent.type(within(dialog).getByLabelText(/Title/), 'Read handbook');
    await userEvent.click(within(dialog).getByRole('combobox', { name: /Category/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Training' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(api.createEntry).toHaveBeenCalledWith('tasks', {
        entryDate: todayIso(),
        title: 'Read handbook',
        description: undefined,
        category: 'TRAINING',
        status: 'TODO',
        priority: 'MEDIUM',
      }),
    );
    expect(await screen.findByText('Task added')).toBeInTheDocument();
  });

  it('sends the version when editing and shows conflicts', async () => {
    const { AxiosError, AxiosHeaders } = await import('axios');
    api.updateEntry.mockRejectedValue(
      new AxiosError('Conflict', '409', undefined, undefined, {
        status: 409,
        statusText: 'Conflict',
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: { detail: 'This entry was changed elsewhere. Reload it and try again.' },
      }),
    );
    api.listEntries.mockResolvedValue(page([task({ version: 3 })]));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Set up laptop' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(
      await within(dialog).findByText('This entry was changed elsewhere. Reload it and try again.'),
    ).toBeInTheDocument();
    expect(api.updateEntry).toHaveBeenCalledWith(
      'tasks',
      1,
      expect.objectContaining({ title: 'Set up laptop', version: 3 }),
    );
  });

  it('asks for confirmation before deleting', async () => {
    api.deleteEntry.mockResolvedValue();
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Delete Set up laptop' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/will be permanently deleted/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(api.deleteEntry).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Delete Set up laptop' }));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }),
    );
    await waitFor(() => expect(api.deleteEntry).toHaveBeenCalledWith('tasks', 1));
    expect(await screen.findByText('Task deleted')).toBeInTheDocument();
  });

  it('toggles completion in one click', async () => {
    api.changeTaskStatus.mockResolvedValue(task({ status: 'COMPLETED' }));
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: 'Complete Set up laptop' }));
    expect(api.changeTaskStatus).toHaveBeenCalledWith(1, 'COMPLETED');
  });
});
