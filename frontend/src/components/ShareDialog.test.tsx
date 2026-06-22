import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ShareDialog from './ShareDialog';

vi.mock('../api/share', () => ({
  getSocialConnections: vi.fn(),
  shareEntry: vi.fn(),
}));

import { getSocialConnections, shareEntry } from '../api/share';

const mockGetConnections = vi.mocked(getSocialConnections);
const mockShareEntry = vi.mocked(shareEntry);

const defaultProps = {
  entryId: 1,
  entryTitle: 'My First Day',
  entryContent: 'Today was a great day at the office.',
  onClose: vi.fn(),
};

describe('ShareDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConnections.mockResolvedValue([
      { id: 1, platform: 'twitter', platformUserId: 'tw-123', connectedAt: '2024-01-01T00:00:00' },
      { id: 2, platform: 'linkedin', platformUserId: 'li-456', connectedAt: '2024-01-01T00:00:00' },
      { id: 3, platform: 'facebook', platformUserId: 'fb-789', connectedAt: '2024-01-01T00:00:00' },
    ]);
  });

  it('renders with all three platform options', async () => {
    render(<ShareDialog {...defaultProps} />);

    expect(screen.getByText('Share Entry')).toBeInTheDocument();
    expect(screen.getByText('Twitter / X')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
    expect(screen.getByText('Facebook')).toBeInTheDocument();
  });

  it('renders message preview with entry title and content', async () => {
    render(<ShareDialog {...defaultProps} />);

    await waitFor(() => {
      const textarea = screen.getByLabelText('Message') as HTMLTextAreaElement;
      expect(textarea.value).toContain('My First Day');
      expect(textarea.value).toContain('Today was a great day');
    });
  });

  it('calls API on share confirmation', async () => {
    const user = userEvent.setup();
    mockShareEntry.mockResolvedValue({
      id: 1,
      entryId: 1,
      platform: 'twitter',
      sharedAt: '2024-01-01T00:00:00',
      postUrl: 'https://twitter.com/i/web/status/123',
      message: 'test',
    });

    render(<ShareDialog {...defaultProps} />);

    await waitFor(() => {
      expect(mockGetConnections).toHaveBeenCalled();
    });

    const shareButton = screen.getByRole('button', { name: 'Share' });
    await user.click(shareButton);

    await waitFor(() => {
      expect(mockShareEntry).toHaveBeenCalledWith(1, expect.objectContaining({
        platform: 'twitter',
      }));
    });
  });

  it('shows success feedback after sharing', async () => {
    const user = userEvent.setup();
    mockShareEntry.mockResolvedValue({
      id: 1,
      entryId: 1,
      platform: 'twitter',
      sharedAt: '2024-01-01T00:00:00',
      postUrl: 'https://twitter.com/i/web/status/123',
      message: 'test',
    });

    render(<ShareDialog {...defaultProps} />);

    await waitFor(() => {
      expect(mockGetConnections).toHaveBeenCalled();
    });

    const shareButton = screen.getByRole('button', { name: 'Share' });
    await user.click(shareButton);

    await waitFor(() => {
      expect(screen.getByText(/Shared successfully/)).toBeInTheDocument();
    });
  });

  it('shows error feedback when sharing fails', async () => {
    const user = userEvent.setup();
    mockShareEntry.mockRejectedValue(new Error('Network error'));

    render(<ShareDialog {...defaultProps} />);

    await waitFor(() => {
      expect(mockGetConnections).toHaveBeenCalled();
    });

    const shareButton = screen.getByRole('button', { name: 'Share' });
    await user.click(shareButton);

    await waitFor(() => {
      expect(screen.getByText(/Failed to share/)).toBeInTheDocument();
    });
  });

  it('shows not-connected warning when platform is not linked', async () => {
    mockGetConnections.mockResolvedValue([]);
    const user = userEvent.setup();

    render(<ShareDialog {...defaultProps} />);

    await waitFor(() => {
      expect(mockGetConnections).toHaveBeenCalled();
    });

    const shareButton = screen.getByRole('button', { name: 'Share' });
    await user.click(shareButton);

    await waitFor(() => {
      expect(screen.getByText(/connect your twitter account/i)).toBeInTheDocument();
    });
  });

  it('allows switching between platforms', async () => {
    const user = userEvent.setup();
    render(<ShareDialog {...defaultProps} />);

    const linkedinBtn = screen.getByText('LinkedIn');
    await user.click(linkedinBtn);
    expect(linkedinBtn.closest('button')).toHaveClass('active');

    const facebookBtn = screen.getByText('Facebook');
    await user.click(facebookBtn);
    expect(facebookBtn.closest('button')).toHaveClass('active');
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<ShareDialog {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('allows editing the share message', async () => {
    const user = userEvent.setup();
    render(<ShareDialog {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Message')).toBeInTheDocument();
    });

    const textarea = screen.getByLabelText('Message') as HTMLTextAreaElement;
    await user.clear(textarea);
    await user.type(textarea, 'Custom message!');

    expect(textarea.value).toBe('Custom message!');
  });
});
