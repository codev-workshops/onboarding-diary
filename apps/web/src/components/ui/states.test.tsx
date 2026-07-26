import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../lib/apiClient.js';
import { EmptyState, ErrorState } from './states.js';

describe('EmptyState', () => {
  it('renders its title, description, and action', () => {
    render(
      <EmptyState
        title="No tasks yet"
        description="Log your first task."
        action={<button>Add</button>}
      />,
    );
    expect(screen.getByText('No tasks yet')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Add' })).toBeVisible();
  });
});

describe('ErrorState', () => {
  it('shows the requestId so support can find the server log', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <ErrorState
        error={
          new ApiError({
            status: 500,
            code: 'INTERNAL_ERROR',
            message: 'Something went wrong',
            requestId: 'req-42',
          })
        }
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByText('Reference: req-42')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('falls back to a plain error message with no reference line', () => {
    render(<ErrorState error={new Error('Boom')} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Boom');
    expect(screen.queryByText(/Reference:/)).not.toBeInTheDocument();
  });

  it('renders the shared access-denied screen for a 403 instead of a retry', () => {
    render(
      <MemoryRouter>
        <ErrorState
          error={new ApiError({ status: 403, code: 'FORBIDDEN', message: 'Not your diary' })}
          onRetry={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'You do not have access to this' })).toBeVisible();
    expect(screen.getByText('Not your diary')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });
});
