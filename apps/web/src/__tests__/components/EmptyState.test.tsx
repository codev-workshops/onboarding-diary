import { describe, it, expect } from 'vitest';
import { render, screen } from '../test-utils';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No items" />);
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<EmptyState title="Empty" description="Create something" />);
    expect(screen.getByText('Create something')).toBeInTheDocument();
  });

  it('renders action button', () => {
    render(
      <EmptyState
        title="Empty"
        action={<Button>Create</Button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });
});
