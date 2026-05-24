import { describe, it, expect } from 'vitest';
import { render, screen } from '../test-utils';
import { Card, CardHeader, CardContent, StatCard } from '@/components/ui/Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Card className="custom-class">Content</Card>);
    expect(screen.getByText('Content').closest('div')).toHaveClass('custom-class');
  });
});

describe('CardHeader', () => {
  it('renders children', () => {
    render(<CardHeader>Header</CardHeader>);
    expect(screen.getByText('Header')).toBeInTheDocument();
  });
});

describe('CardContent', () => {
  it('renders children', () => {
    render(<CardContent>Body</CardContent>);
    expect(screen.getByText('Body')).toBeInTheDocument();
  });
});

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="Total Tasks" value={42} />);
    expect(screen.getByText('Total Tasks')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders subtext when provided', () => {
    render(<StatCard label="Rate" value="85%" subtext="Above average" />);
    expect(screen.getByText('Above average')).toBeInTheDocument();
  });

  it('does not render subtext when not provided', () => {
    render(<StatCard label="Count" value={10} />);
    expect(screen.queryByText('Above average')).not.toBeInTheDocument();
  });
});
