import { describe, it, expect, vi } from 'vitest';
import { render, screen, userEvent } from '../test-utils';
import { Modal } from '@/components/ui/Modal';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Test">
        <p>Content</p>
      </Modal>,
    );
    expect(screen.queryByText('Test')).not.toBeInTheDocument();
  });

  it('renders title and content when open', () => {
    render(
      <Modal open onClose={vi.fn()} title="My Modal">
        <p>Modal content</p>
      </Modal>,
    );
    expect(screen.getByText('My Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Closeable">
        <p>Body</p>
      </Modal>,
    );

    const closeBtn = screen.getByRole('button');
    await userEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
