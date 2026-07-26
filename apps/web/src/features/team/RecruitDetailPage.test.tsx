import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { dashboardFixture } from '../../test/dashboardFixtures.js';
import {
  fakeClient,
  issueFixture,
  MANAGER,
  page,
  RECRUIT,
  taskFixture,
} from '../../test/fakeClient.js';
import type { FakeClient } from '../../test/fakeClient.js';
import { renderWithProviders } from '../../test/render.js';
import { RecruitDetailPage } from './RecruitDetailPage.js';

function render(): FakeClient {
  const client = fakeClient({
    session: MANAGER,
    handlers: {
      get: (path) => {
        if (path === `/users/${RECRUIT.id}`) return { data: RECRUIT };
        if (path === '/dashboard') return { data: dashboardFixture() };
        if (path === '/tasks') return page([taskFixture()]);
        if (path === '/issues') return page([issueFixture()]);
        return undefined;
      },
    },
  });

  renderWithProviders(
    <Routes>
      <Route path="/team/:userId" element={<RecruitDetailPage />} />
    </Routes>,
    { client, route: `/team/${RECRUIT.id}` },
  );
  return client;
}

describe('RecruitDetailPage', () => {
  it('scopes the diary to the selected recruit and offers no write controls', async () => {
    const user = userEvent.setup();
    const client = render();

    expect(await screen.findByRole('heading', { name: 'Nadia Khan' })).toBeVisible();
    await waitFor(() =>
      expect(client.get).toHaveBeenCalledWith('/dashboard', {
        query: { ownerId: RECRUIT.id },
      }),
    );

    await user.click(screen.getByRole('tab', { name: 'Tasks' }));

    await waitFor(() =>
      expect(client.get).toHaveBeenCalledWith('/tasks', {
        query: expect.objectContaining({ ownerId: RECRUIT.id }),
      }),
    );
    expect(await screen.findByText('Set up the laptop')).toBeVisible();
    expect(screen.queryByRole('button', { name: /^Add/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Delete/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Issues' }));

    expect(await screen.findByText('VPN keeps dropping')).toBeVisible();
    expect(screen.queryByRole('button', { name: /^Delete/ })).not.toBeInTheDocument();
  });
});
