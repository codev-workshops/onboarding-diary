import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { fakeClient, page, RECRUIT, taskFixture } from '../../test/fakeClient.js';
import type { FakeClient } from '../../test/fakeClient.js';
import { renderWithProviders } from '../../test/render.js';
import { TasksPage } from './TasksPage.js';

function render(client: FakeClient, route = '/tasks') {
  return renderWithProviders(<TasksPage />, { client, route });
}

function withTasks(tasks = [taskFixture()], total?: number): FakeClient {
  return fakeClient({
    session: RECRUIT,
    handlers: {
      get: (path) =>
        path === '/tasks' ? page(tasks, total === undefined ? {} : { total }) : undefined,
    },
  });
}

describe('TasksPage', () => {
  it('renders a row per task with its category, status, and priority', async () => {
    render(
      withTasks([
        taskFixture(),
        taskFixture({ id: 'task-2', title: 'Read the handbook', status: 'IN_PROGRESS' }),
      ]),
    );

    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    const row = within(table).getByRole('row', { name: /Set up the laptop/ });
    expect(within(row).getByText('2026-07-20')).toBeVisible();
    expect(within(row).getByText('Setup')).toBeVisible();
    expect(within(row).getByText('Done')).toBeVisible();
    expect(within(row).getByText('High')).toBeVisible();
  });

  it('shows an empty state when nothing is logged yet', async () => {
    render(withTasks([]));

    expect(await screen.findByText('No tasks yet')).toBeVisible();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('asks the API for the next page', async () => {
    const user = userEvent.setup();
    const client = withTasks([taskFixture()], 45);
    render(client);

    await user.click(await screen.findByRole('button', { name: 'Next' }));

    await waitFor(() =>
      expect(client.get).toHaveBeenCalledWith('/tasks', {
        query: expect.objectContaining({ page: 2 }),
      }),
    );
  });

  it('maps the filter bar onto query parameters and clears them all at once', async () => {
    const user = userEvent.setup();
    const client = withTasks();
    render(client);

    await user.selectOptions(await screen.findByLabelText('Status'), 'BLOCKED');
    await user.selectOptions(screen.getByLabelText('Priority'), 'HIGH');

    await waitFor(() =>
      expect(client.get).toHaveBeenCalledWith('/tasks', {
        query: expect.objectContaining({ status: 'BLOCKED', priority: 'HIGH' }),
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Reset filters' }));

    await waitFor(() => expect(screen.getByLabelText('Status')).toHaveValue(''));
    expect(screen.getByLabelText('Priority')).toHaveValue('');
  });

  it('creates a task', async () => {
    const user = userEvent.setup();
    const client = withTasks();
    client.post.mockResolvedValue({ data: taskFixture() });
    render(client);

    await user.click(await screen.findByRole('button', { name: 'Add task' }));
    const form = screen.getByRole('form', { name: 'New task' });
    await user.type(within(form).getByLabelText(/Title/), 'Meet the team');
    await user.click(within(form).getByRole('button', { name: 'Add task' }));

    await waitFor(() =>
      expect(client.post).toHaveBeenCalledWith(
        '/tasks',
        expect.objectContaining({ title: 'Meet the team', status: 'NOT_STARTED' }),
      ),
    );
  });

  it('prefills the form when editing and patches the existing task', async () => {
    const user = userEvent.setup();
    const client = withTasks();
    client.patch.mockResolvedValue({ data: taskFixture({ title: 'Set up the laptop again' }) });
    render(client);

    await user.click(await screen.findByRole('button', { name: 'Edit task Set up the laptop' }));
    const form = screen.getByRole('form', { name: 'Edit task' });
    expect(within(form).getByLabelText(/Title/)).toHaveValue('Set up the laptop');
    expect(within(form).getByLabelText(/Date/)).toHaveValue('2026-07-20');
    expect(within(form).getByLabelText('Status')).toHaveValue('DONE');

    await user.click(within(form).getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(client.patch).toHaveBeenCalledWith(
        `/tasks/${taskFixture().id}`,
        expect.objectContaining({ title: 'Set up the laptop' }),
      ),
    );
  });

  it('refuses a date in the future', async () => {
    const user = userEvent.setup();
    const client = withTasks();
    render(client);

    await user.click(await screen.findByRole('button', { name: 'Add task' }));
    const form = screen.getByRole('form', { name: 'New task' });
    await user.type(within(form).getByLabelText(/Title/), 'Time travel');
    await user.clear(within(form).getByLabelText(/Date/));
    await user.type(within(form).getByLabelText(/Date/), '2099-01-01');
    await user.click(within(form).getByRole('button', { name: 'Add task' }));

    expect(await screen.findByText('Date cannot be in the future')).toBeVisible();
    expect(client.post).not.toHaveBeenCalled();
  });

  it('leaves the task alone when a delete is cancelled', async () => {
    const user = userEvent.setup();
    const client = withTasks();
    render(client);

    await user.click(await screen.findByRole('button', { name: 'Delete task Set up the laptop' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(client.del).not.toHaveBeenCalled();
  });

  it('deletes the task once the confirmation is accepted', async () => {
    const user = userEvent.setup();
    const client = withTasks();
    render(client);

    await user.click(await screen.findByRole('button', { name: 'Delete task Set up the laptop' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(client.del).toHaveBeenCalledWith(`/tasks/${taskFixture().id}`));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
