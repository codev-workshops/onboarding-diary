import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ApiError } from '../../lib/apiClient.js';
import { ADMIN, fakeClient, MANAGER, page, RECRUIT, userFixture } from '../../test/fakeClient.js';
import type { FakeClient } from '../../test/fakeClient.js';
import { renderWithProviders } from '../../test/render.js';
import { AdminUsersPage } from './AdminUsersPage.js';

function adminClient(users = [RECRUIT], total?: number): FakeClient {
  return fakeClient({
    session: ADMIN,
    handlers: {
      get: (path, options) => {
        if (path !== '/users') return undefined;
        if (options?.query?.['role'] === 'MANAGER') return page([MANAGER]);
        return page(users, total === undefined ? {} : { total });
      },
    },
  });
}

function render(client: FakeClient) {
  return renderWithProviders(<AdminUsersPage />, { client, route: '/admin/users' });
}

describe('AdminUsersPage', () => {
  it('maps the search box and filters onto the users query', async () => {
    const user = userEvent.setup();
    const client = adminClient();
    render(client);

    await user.type(await screen.findByLabelText('Search'), 'nadia');
    await user.selectOptions(screen.getByLabelText('Role'), 'RECRUIT');
    await user.selectOptions(screen.getByLabelText('Status'), 'false');

    await waitFor(() =>
      expect(client.get).toHaveBeenCalledWith('/users', {
        query: expect.objectContaining({ q: 'nadia', role: 'RECRUIT', isActive: 'false' }),
      }),
    );
  });

  it('pages through a long list', async () => {
    const user = userEvent.setup();
    const client = adminClient([RECRUIT], 60);
    render(client);

    await user.click(await screen.findByRole('button', { name: 'Next' }));

    await waitFor(() =>
      expect(client.get).toHaveBeenCalledWith('/users', {
        query: expect.objectContaining({ page: 2 }),
      }),
    );
  });

  it('changes a role', async () => {
    const user = userEvent.setup();
    const client = adminClient();
    client.patch.mockResolvedValue({ data: userFixture({ role: 'MANAGER' }) });
    render(client);

    await user.selectOptions(await screen.findByLabelText('Role for Nadia Khan'), 'MANAGER');

    await waitFor(() =>
      expect(client.patch).toHaveBeenCalledWith(`/users/${RECRUIT.id}`, { role: 'MANAGER' }),
    );
  });

  it('shows the self-protection error when an admin demotes themselves', async () => {
    const user = userEvent.setup();
    const client = adminClient([ADMIN]);
    client.patch.mockRejectedValue(
      new ApiError({
        status: 422,
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: [{ field: 'role', message: 'You cannot change your own role' }],
      }),
    );
    render(client);

    await user.selectOptions(await screen.findByLabelText('Role for Priya Rao'), 'RECRUIT');

    expect(await screen.findByText('You cannot change your own role')).toBeVisible();
  });

  it('confirms before deactivating a user', async () => {
    const user = userEvent.setup();
    const client = adminClient();
    client.patch.mockResolvedValue({ data: userFixture({ isActive: false }) });
    render(client);

    await user.click(await screen.findByRole('button', { name: 'Deactivate Nadia Khan' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(client.patch).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Deactivate Nadia Khan' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Deactivate' }),
    );

    await waitFor(() =>
      expect(client.patch).toHaveBeenCalledWith(`/users/${RECRUIT.id}`, { isActive: false }),
    );
  });

  it('assigns and clears a manager', async () => {
    const user = userEvent.setup();
    const client = adminClient();
    client.patch.mockResolvedValue({ data: userFixture({ managerId: MANAGER.id }) });
    render(client);

    const picker = await screen.findByLabelText('Manager for Nadia Khan');
    await waitFor(() =>
      expect(within(picker).getByRole('option', { name: 'Marcus Lee' })).toBeInTheDocument(),
    );

    await user.selectOptions(picker, MANAGER.id);
    await waitFor(() =>
      expect(client.patch).toHaveBeenCalledWith(`/users/${RECRUIT.id}`, {
        managerId: MANAGER.id,
      }),
    );

    await user.selectOptions(picker, '');
    await waitFor(() =>
      expect(client.patch).toHaveBeenCalledWith(`/users/${RECRUIT.id}`, { managerId: null }),
    );
  });

  it('changes and clears a department', async () => {
    const user = userEvent.setup();
    const client = adminClient();
    client.patch.mockResolvedValue({ data: userFixture({ department: 'Support' }) });
    render(client);

    const field = await screen.findByLabelText('Department for Nadia Khan');
    const save = screen.getByRole('button', { name: 'Save department for Nadia Khan' });
    expect(save).toBeDisabled();

    await user.clear(field);
    await user.type(field, 'Support');
    await user.click(save);
    await waitFor(() =>
      expect(client.patch).toHaveBeenCalledWith(`/users/${RECRUIT.id}`, { department: 'Support' }),
    );

    await user.clear(field);
    await user.type(field, '{Enter}');
    await waitFor(() =>
      expect(client.patch).toHaveBeenCalledWith(`/users/${RECRUIT.id}`, { department: '' }),
    );
  });

  it('shows the cycle error returned by the API', async () => {
    const user = userEvent.setup();
    const client = adminClient();
    client.patch.mockRejectedValue(
      new ApiError({
        status: 409,
        code: 'CONFLICT',
        message: 'That assignment would create a management cycle',
      }),
    );
    render(client);

    const picker = await screen.findByLabelText('Manager for Nadia Khan');
    await waitFor(() =>
      expect(within(picker).getByRole('option', { name: 'Marcus Lee' })).toBeInTheDocument(),
    );
    await user.selectOptions(picker, MANAGER.id);

    expect(
      await screen.findByText('That assignment would create a management cycle'),
    ).toBeVisible();
  });
});
