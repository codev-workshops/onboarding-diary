import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { PasswordField } from './PasswordField';

function Harness() {
  const [value, setValue] = useState('');
  return <PasswordField id="pw" label="Password" value={value} onChange={setValue} />;
}

describe('PasswordField', () => {
  it('toggles visibility and shows the policy hint', async () => {
    render(<Harness />);
    expect(screen.getByText('Minimum 8 characters.')).toBeInTheDocument();
    const input = screen.getByLabelText('Password') as HTMLInputElement;
    expect(input.type).toBe('password');
    await userEvent.click(screen.getByLabelText('Show password'));
    expect(input.type).toBe('text');
    await userEvent.click(screen.getByLabelText('Hide password'));
    expect(input.type).toBe('password');
  });

  it('generates a strong password and reveals it', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByLabelText('Generate password'));
    const input = screen.getByLabelText('Password') as HTMLInputElement;
    expect(input.value.length).toBe(16);
    expect(input.type).toBe('text');
  });

  it('copies the current value to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<Harness />);
    await userEvent.click(screen.getByLabelText('Generate password'));
    await userEvent.click(screen.getByLabelText('Copy password'));
    expect(writeText).toHaveBeenCalledOnce();
  });
});
