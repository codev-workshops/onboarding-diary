import { describe, it, expect } from 'vitest';
import { render, screen } from '../test-utils';
import { Badge, StatusBadge } from '@/components/ui/Badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('applies default variant', () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText('Default').className).toContain('bg-gray-100');
  });

  it('applies success variant', () => {
    render(<Badge variant="success">Done</Badge>);
    expect(screen.getByText('Done').className).toContain('bg-green-100');
  });

  it('applies danger variant', () => {
    render(<Badge variant="danger">Error</Badge>);
    expect(screen.getByText('Error').className).toContain('bg-red-100');
  });
});

describe('StatusBadge', () => {
  it('renders status text with underscores replaced', () => {
    render(<StatusBadge status="IN_PROGRESS" />);
    expect(screen.getByText('IN PROGRESS')).toBeInTheDocument();
  });

  it('maps COMPLETED to success variant', () => {
    render(<StatusBadge status="COMPLETED" />);
    const el = screen.getByText('COMPLETED');
    expect(el.className).toContain('bg-green-100');
  });

  it('maps PENDING to warning variant', () => {
    render(<StatusBadge status="PENDING" />);
    const el = screen.getByText('PENDING');
    expect(el.className).toContain('bg-yellow-100');
  });

  it('maps CRITICAL to danger variant', () => {
    render(<StatusBadge status="CRITICAL" />);
    const el = screen.getByText('CRITICAL');
    expect(el.className).toContain('bg-red-100');
  });

  it('handles unknown status with default variant', () => {
    render(<StatusBadge status="UNKNOWN_STATUS" />);
    expect(screen.getByText('UNKNOWN STATUS')).toBeInTheDocument();
  });
});
