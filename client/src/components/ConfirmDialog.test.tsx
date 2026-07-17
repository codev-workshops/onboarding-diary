import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders nothing when closed', () => {
    render(
      <ConfirmDialog open={false} title="Delete?" message="x" onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('fires confirm and cancel callbacks', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Delete item?"
        message="It will be removed."
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByText('It will be removed.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('shows a pending label and disables confirm', () => {
    render(
      <ConfirmDialog open title="Delete?" message="x" pending onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    const confirm = screen.getByRole('button', { name: 'Working…' });
    expect(confirm).toBeDisabled();
  });
});
