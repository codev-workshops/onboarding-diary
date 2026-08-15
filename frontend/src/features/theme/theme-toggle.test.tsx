import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/test-utils';
import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  it('switches to dark mode and persists the preference', async () => {
    const user = userEvent.setup();
    localStorage.removeItem('onboarding-diary.theme');

    renderWithProviders(<ThemeToggle />);

    await user.click(screen.getByLabelText('Switch to dark theme'));

    expect(localStorage.getItem('onboarding-diary.theme')).toBe('dark');
    expect(screen.getByLabelText('Switch to light theme')).toBeInTheDocument();
  });
});
