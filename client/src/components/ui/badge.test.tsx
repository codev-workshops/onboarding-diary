import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge, toneFor } from './badge';

describe('toneFor', () => {
  it('maps completed/resolved values to success', () => {
    expect(toneFor('Done')).toBe('success');
    expect(toneFor('Resolved')).toBe('success');
  });

  it('maps critical to danger and open to warning', () => {
    expect(toneFor('Critical')).toBe('danger');
    expect(toneFor('Open')).toBe('warning');
  });

  it('falls back to neutral for unknown values', () => {
    expect(toneFor('Whatever')).toBe('neutral');
  });
});

describe('Badge', () => {
  it('renders its children', () => {
    render(<Badge tone="success">Done</Badge>);
    expect(screen.getByText('Done')).toBeInTheDocument();
  });
});
