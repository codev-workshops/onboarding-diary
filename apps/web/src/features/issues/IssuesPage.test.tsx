import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { fakeClient, issueFixture, page, RECRUIT } from '../../test/fakeClient.js';
import type { FakeClient } from '../../test/fakeClient.js';
import { renderWithProviders } from '../../test/render.js';
import { IssuesPage } from './IssuesPage.js';

function withIssues(issues = [issueFixture()]): FakeClient {
  return fakeClient({
    session: RECRUIT,
    handlers: { get: (path) => (path === '/issues' ? page(issues) : undefined) },
  });
}

function render(client: FakeClient) {
  return renderWithProviders(<IssuesPage />, { client, route: '/issues' });
}

describe('IssuesPage', () => {
  it('renders each issue with its severity and status', async () => {
    render(withIssues());

    const row = within(await screen.findByRole('table')).getByRole('row', {
      name: /VPN keeps dropping/,
    });
    expect(within(row).getByText('High')).toBeVisible();
    expect(within(row).getByText('Open')).toBeVisible();
  });

  it('shows an empty state when there are no issues', async () => {
    render(withIssues([]));

    expect(await screen.findByText('No issues yet')).toBeVisible();
  });

  it('maps severity and status filters onto the query', async () => {
    const user = userEvent.setup();
    const client = withIssues();
    render(client);

    await user.selectOptions(await screen.findByLabelText('Severity'), 'CRITICAL');
    await user.selectOptions(screen.getByLabelText('Status'), 'RESOLVED');

    await waitFor(() =>
      expect(client.get).toHaveBeenCalledWith('/issues', {
        query: expect.objectContaining({ severity: 'CRITICAL', status: 'RESOLVED' }),
      }),
    );
  });

  it('asks for resolution notes only once the issue is being closed', async () => {
    const user = userEvent.setup();
    const client = withIssues();
    render(client);

    await user.click(await screen.findByRole('button', { name: 'Add issue' }));
    const form = screen.getByRole('form', { name: 'New issue' });
    expect(within(form).queryByLabelText('Resolution notes')).not.toBeInTheDocument();

    await user.selectOptions(within(form).getByLabelText('Status'), 'RESOLVED');
    const notes = within(form).getByLabelText('Resolution notes');
    expect(notes).toBeVisible();
    expect(
      within(form).getByText('Explain how this issue ended now that it is Resolved.'),
    ).toBeVisible();

    await user.selectOptions(within(form).getByLabelText('Status'), 'WONT_FIX');
    expect(
      within(form).getByText("Explain how this issue ended now that it is Won't Fix."),
    ).toBeVisible();

    await user.selectOptions(within(form).getByLabelText('Status'), 'OPEN');
    expect(within(form).queryByLabelText('Resolution notes')).not.toBeInTheDocument();
  });

  it('deletes an issue after the confirmation is accepted', async () => {
    const user = userEvent.setup();
    const client = withIssues();
    render(client);

    await user.click(
      await screen.findByRole('button', { name: 'Delete issue VPN keeps dropping' }),
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(client.del).toHaveBeenCalledWith(`/issues/${issueFixture().id}`));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
