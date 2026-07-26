import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { fakeClient, noteFixture, page, RECRUIT } from '../../test/fakeClient.js';
import type { FakeClient } from '../../test/fakeClient.js';
import { renderWithProviders } from '../../test/render.js';
import { NotesPage } from './NotesPage.js';

function withNotes(notes = [noteFixture()]): FakeClient {
  return fakeClient({
    session: RECRUIT,
    handlers: { get: (path) => (path === '/notes' ? page(notes) : undefined) },
  });
}

function render(client: FakeClient) {
  return renderWithProviders(<NotesPage />, { client, route: '/notes' });
}

describe('NotesPage', () => {
  it('renders a chip per tag', async () => {
    render(withNotes());

    const row = within(await screen.findByRole('table')).getByRole('row', {
      name: /Deploy runbook/,
    });
    expect(within(row).getByRole('button', { name: 'Filter by tag deploy' })).toBeVisible();
    expect(within(row).getByRole('button', { name: 'Filter by tag runbook' })).toBeVisible();
  });

  it('filters by a tag when its chip is chosen, and clears it when chosen again', async () => {
    const user = userEvent.setup();
    const client = withNotes();
    render(client);

    await user.click(await screen.findByRole('button', { name: 'Filter by tag deploy' }));

    await waitFor(() =>
      expect(client.get).toHaveBeenCalledWith('/notes', {
        query: expect.objectContaining({ tag: 'deploy' }),
      }),
    );
    expect(screen.getByLabelText('Tag')).toHaveValue('deploy');

    await user.click(screen.getByRole('button', { name: 'Filter by tag deploy' }));
    await waitFor(() => expect(screen.getByLabelText('Tag')).toHaveValue(''));
  });

  it('normalises tags added and removed in the form before submitting', async () => {
    const user = userEvent.setup();
    const client = withNotes();
    client.post.mockResolvedValue({ data: noteFixture() });
    render(client);

    await user.click(await screen.findByRole('button', { name: 'Add note' }));
    const form = screen.getByRole('form', { name: 'New note' });
    await user.type(within(form).getByLabelText(/Title/), 'VPN setup');

    const tags = within(form).getByLabelText(/Tags/);
    await user.type(tags, '  VPN  {enter}');
    await user.type(tags, 'vpn{enter}');
    await user.type(tags, 'Network{enter}');
    await user.type(tags, 'temporary{enter}');
    await user.click(within(form).getByRole('button', { name: 'Remove tag temporary' }));

    await user.click(within(form).getByRole('button', { name: 'Add note' }));

    await waitFor(() =>
      expect(client.post).toHaveBeenCalledWith(
        '/notes',
        expect.objectContaining({ title: 'VPN setup', tags: ['vpn', 'network'] }),
      ),
    );
  });

  it('deletes a note after the confirmation is accepted', async () => {
    const user = userEvent.setup();
    const client = withNotes();
    render(client);

    await user.click(await screen.findByRole('button', { name: 'Delete note Deploy runbook' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(client.del).toHaveBeenCalledWith(`/notes/${noteFixture().id}`));
  });
});
