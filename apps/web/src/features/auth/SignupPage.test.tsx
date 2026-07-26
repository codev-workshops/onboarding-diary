import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ApiError } from '../../lib/apiClient.js';
import { fakeClient } from '../../test/fakeClient.js';
import { renderWithProviders } from '../../test/render.js';
import { SignupPage } from './SignupPage.js';

async function fillForm(user: ReturnType<typeof userEvent.setup>, password: string): Promise<void> {
  await user.type(await screen.findByLabelText(/Full name/), 'Nadia Khan');
  await user.type(screen.getByLabelText(/Email/), 'nadia@example.com');
  await user.type(screen.getByLabelText(/Password/), password);
  await user.click(screen.getByRole('button', { name: 'Create account' }));
}

describe('SignupPage', () => {
  it('rejects a password shorter than the shared minimum', async () => {
    const user = userEvent.setup();
    const client = fakeClient();
    renderWithProviders(<SignupPage />, { client });

    await fillForm(user, 'short');

    expect(await screen.findByText('Must be at least 10 characters')).toBeVisible();
    expect(client.post).not.toHaveBeenCalled();
  });

  it('puts a duplicate address on the email field', async () => {
    const user = userEvent.setup();
    const client = fakeClient();
    client.post.mockRejectedValue(
      new ApiError({
        status: 409,
        code: 'EMAIL_ALREADY_EXISTS',
        message: 'That email is already registered',
      }),
    );
    renderWithProviders(<SignupPage />, { client });

    await fillForm(user, 'onboarding-demo-2026');

    expect(await screen.findByText('That email is already registered.')).toBeVisible();
    expect(screen.getByLabelText(/Email/)).toHaveAttribute('aria-invalid', 'true');
  });
});
