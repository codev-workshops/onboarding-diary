import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../lib/apiClient.js';
import { dashboardFixture } from '../../test/dashboardFixtures.js';
import { fakeClient, MANAGER, RECRUIT } from '../../test/fakeClient.js';
import type { FakeClient } from '../../test/fakeClient.js';
import { renderWithProviders } from '../../test/render.js';
import { RecruitDetailPage } from '../team/RecruitDetailPage.js';
import { ReportBuilder } from './ReportBuilder.js';

const FILENAME = 'onboarding-diary_nadia-khan_2026-07-01_2026-07-26.csv';

function downloadingClient(): FakeClient {
  return fakeClient({
    session: RECRUIT,
    handlers: {
      download: () => ({
        blob: new Blob(['date,title'], { type: 'text/csv' }),
        filename: FILENAME,
      }),
    },
  });
}

describe('ReportBuilder', () => {
  it('clears and restores every section with the combined shortcut', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportBuilder />, { client: downloadingClient(), route: '/reports' });

    const form = await screen.findByRole('form', { name: 'Report builder' });
    const combined = within(form).getByLabelText('Combined report (all sections)');
    expect(combined).toBeChecked();

    await user.click(combined);
    for (const label of ['Tasks', 'Issues', 'Feedback', 'Notes']) {
      expect(within(form).getByLabelText(label)).not.toBeChecked();
    }

    await user.click(combined);
    for (const label of ['Tasks', 'Issues', 'Feedback', 'Notes']) {
      expect(within(form).getByLabelText(label)).toBeChecked();
    }
  });

  it('refuses a range that starts after it ends', async () => {
    const user = userEvent.setup();
    const client = downloadingClient();
    renderWithProviders(<ReportBuilder />, { client, route: '/reports' });

    const form = await screen.findByRole('form', { name: 'Report builder' });
    const from = within(form).getByLabelText(/From/);
    await user.clear(from);
    await user.type(from, '2026-07-31');
    const to = within(form).getByLabelText(/To/);
    await user.clear(to);
    await user.type(to, '2026-07-01');
    await user.click(within(form).getByRole('button', { name: 'Download report' }));

    expect(
      await screen.findByText('The start date must be on or before the end date'),
    ).toBeVisible();
    expect(client.download).not.toHaveBeenCalled();
  });

  it('reports at least one section is needed', async () => {
    const user = userEvent.setup();
    const client = downloadingClient();
    renderWithProviders(<ReportBuilder />, { client, route: '/reports' });

    const form = await screen.findByRole('form', { name: 'Report builder' });
    await user.click(within(form).getByLabelText('Combined report (all sections)'));
    await user.click(within(form).getByRole('button', { name: 'Download report' }));

    expect(await screen.findByText('Select at least one section')).toBeVisible();
    expect(client.download).not.toHaveBeenCalled();
  });

  it('saves the file under the name the server chose', async () => {
    const user = userEvent.setup();
    const client = downloadingClient();
    const createObjectURL = vi.fn(() => 'blob:report');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));

    renderWithProviders(<ReportBuilder />, { client, route: '/reports' });
    await user.click(await screen.findByRole('button', { name: 'Download report' }));

    await waitFor(() => expect(client.download).toHaveBeenCalledTimes(1));
    expect(client.download.mock.calls[0]?.[1]).toMatchObject({
      sections: ['TASKS', 'ISSUES', 'FEEDBACK', 'NOTES'],
      format: 'CSV',
    });
    expect(await screen.findByText(`Downloaded ${FILENAME}`)).toBeVisible();
    expect(createObjectURL).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  it('surfaces a failed generation', async () => {
    const user = userEvent.setup();
    const client = downloadingClient();
    client.download.mockRejectedValue(
      new ApiError({
        status: 500,
        code: 'INTERNAL_ERROR',
        message: 'The report could not be built',
      }),
    );

    renderWithProviders(<ReportBuilder />, { client, route: '/reports' });
    await user.click(await screen.findByRole('button', { name: 'Download report' }));

    expect(await screen.findByText('The report could not be built')).toBeVisible();
  });

  it('scopes a report to the recruit a manager is viewing', async () => {
    const user = userEvent.setup();
    const client = fakeClient({
      session: MANAGER,
      handlers: {
        get: (path) => {
          if (path === `/users/${RECRUIT.id}`) return { data: RECRUIT };
          if (path === '/dashboard') return { data: dashboardFixture() };
          return undefined;
        },
        download: () => ({ blob: new Blob(['x']), filename: FILENAME }),
      },
    });
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:report'), revokeObjectURL: vi.fn() }),
    );

    renderWithProviders(
      <Routes>
        <Route path="/team/:userId" element={<RecruitDetailPage />} />
      </Routes>,
      { client, route: `/team/${RECRUIT.id}` },
    );

    await user.click(await screen.findByRole('tab', { name: 'Report' }));
    await user.click(await screen.findByRole('button', { name: 'Download report' }));

    await waitFor(() => expect(client.download).toHaveBeenCalledTimes(1));
    expect(client.download.mock.calls[0]?.[1]).toMatchObject({ ownerId: RECRUIT.id });

    vi.unstubAllGlobals();
  });
});
