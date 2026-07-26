import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '../lib/apiClient.js';
import { ErrorBoundary } from './ErrorBoundary.js';

function Boom({ error }: { error: unknown }): ReactNode {
  throw error;
}

/**
 * A failing render unmounts the subtree and React may re-render it synchronously, so whether
 * the child throws is controlled from the test rather than by a first-render flag.
 */
const flaky = { failing: true };

function FlakyPage(): ReactNode {
  if (flaky.failing) throw new Error('render failed');
  return <p>Recovered content</p>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    flaky.failing = true;
  });

  it('replaces a thrown render error with a retryable message', () => {
    render(
      <ErrorBoundary>
        <Boom error={new Error('render failed')} />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
  });

  it('shows the requestId when the failure came from the API', () => {
    render(
      <ErrorBoundary>
        <Boom
          error={
            new ApiError({
              status: 500,
              code: 'INTERNAL_ERROR',
              message: 'Boom',
              requestId: 'req-42',
            })
          }
        />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Reference: req-42')).toBeVisible();
  });

  it('renders the children again when the user retries', async () => {
    const user = userEvent.setup();
    render(
      <ErrorBoundary>
        <FlakyPage />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeVisible();

    flaky.failing = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('Recovered content')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('clears the failure when the route changes', () => {
    const { rerender } = render(
      <ErrorBoundary resetKey="/tasks">
        <Boom error={new Error('render failed')} />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeVisible();

    rerender(
      <ErrorBoundary resetKey="/issues">
        <p>Issue log</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Issue log')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
