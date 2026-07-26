import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { fakeClient, feedbackFixture, page, RECRUIT } from '../../test/fakeClient.js';
import type { FakeClient } from '../../test/fakeClient.js';
import { renderWithProviders } from '../../test/render.js';
import { FeedbackPage } from './FeedbackPage.js';

function withFeedback(notes = [feedbackFixture()]): FakeClient {
  return fakeClient({
    session: RECRUIT,
    handlers: { get: (path) => (path === '/feedback' ? page(notes) : undefined) },
  });
}

function render(client: FakeClient) {
  return renderWithProviders(<FeedbackPage />, { client, route: '/feedback' });
}

describe('FeedbackPage', () => {
  it('badges each note with its type', async () => {
    render(withFeedback());

    const row = within(await screen.findByRole('table')).getByRole('row', {
      name: /Great onboarding buddy/,
    });
    expect(within(row).getByText('Positive')).toBeVisible();
  });

  it('filters by type', async () => {
    const user = userEvent.setup();
    const client = withFeedback();
    render(client);

    await user.selectOptions(await screen.findByLabelText('Type'), 'CONCERN');

    await waitFor(() =>
      expect(client.get).toHaveBeenCalledWith('/feedback', {
        query: expect.objectContaining({ type: 'CONCERN' }),
      }),
    );
  });

  it('creates a note and rejects an empty subject', async () => {
    const user = userEvent.setup();
    const client = withFeedback();
    client.post.mockResolvedValue({ data: feedbackFixture() });
    render(client);

    await user.click(await screen.findByRole('button', { name: 'Add feedback' }));
    const form = screen.getByRole('form', { name: 'New feedback note' });

    await user.click(within(form).getByRole('button', { name: 'Add feedback note' }));
    expect(await screen.findByText('This field is required')).toBeVisible();
    expect(client.post).not.toHaveBeenCalled();

    await user.type(within(form).getByLabelText(/Subject/), 'Helpful buddy');
    await user.selectOptions(within(form).getByLabelText('Type'), 'SUGGESTION');
    await user.click(within(form).getByRole('button', { name: 'Add feedback note' }));

    await waitFor(() =>
      expect(client.post).toHaveBeenCalledWith(
        '/feedback',
        expect.objectContaining({ subject: 'Helpful buddy', type: 'SUGGESTION' }),
      ),
    );
  });

  it('deletes a note after the confirmation is accepted', async () => {
    const user = userEvent.setup();
    const client = withFeedback();
    render(client);

    await user.click(
      await screen.findByRole('button', { name: 'Delete feedback note Great onboarding buddy' }),
    );
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(client.del).toHaveBeenCalledWith(`/feedback/${feedbackFixture().id}`),
    );
  });
});
