import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState, ErrorState, LoadingState } from './states';

describe('state components', () => {
  it('renders a loading status with a default and custom label', () => {
    const { rerender } = render(<LoadingState />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    rerender(<LoadingState label="Fetching" />);
    expect(screen.getByRole('status')).toHaveTextContent('Fetching');
  });

  it('renders an error alert with the message', () => {
    render(<ErrorState message="Boom" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Boom');
  });

  it('renders an empty state with an optional hint', () => {
    const { rerender } = render(<EmptyState title="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    rerender(<EmptyState title="Nothing here" hint="Add one below" />);
    expect(screen.getByText('Add one below')).toBeInTheDocument();
  });
});
