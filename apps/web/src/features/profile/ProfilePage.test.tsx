import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { fakeClient, RECRUIT } from '../../test/fakeClient.js';
import { renderWithProviders } from '../../test/render.js';
import { ProfilePage } from './ProfilePage.js';

describe('ProfilePage', () => {
  it('saves the edited profile through the API', async () => {
    const user = userEvent.setup();
    const client = fakeClient({ session: RECRUIT });
    client.patch.mockResolvedValue({ data: { ...RECRUIT, department: 'Platform' } });
    renderWithProviders(<ProfilePage />, { client, route: '/profile' });

    const department = await screen.findByLabelText('Department');
    await waitFor(() => expect(department).toHaveValue('Engineering'));
    await user.clear(department);
    await user.type(department, 'Platform');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(client.patch).toHaveBeenCalledWith('/users/me', {
        fullName: 'Nadia Khan',
        department: 'Platform',
        startDate: '2026-07-01',
      }),
    );
    expect(await screen.findByText('Profile saved')).toBeVisible();
  });

  it('lets a new recruit skip the completion prompt', async () => {
    const user = userEvent.setup();
    const client = fakeClient({ session: { ...RECRUIT, department: null, startDate: null } });
    renderWithProviders(<ProfilePage />, { client, route: '/profile?welcome=1' });

    expect(await screen.findByText('Finish setting up your profile')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Skip for now' }));

    await waitFor(() =>
      expect(screen.queryByText('Finish setting up your profile')).not.toBeInTheDocument(),
    );
    expect(client.patch).not.toHaveBeenCalled();
  });
});
