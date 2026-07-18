import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserName } from './UserName';

describe('UserName', () => {
  it('renders a plain name for an active user', () => {
    render(<UserName name="Rina Recruit" isActive />);
    expect(screen.getByText('Rina Recruit')).toBeInTheDocument();
    expect(screen.queryByText('Deactivated')).not.toBeInTheDocument();
  });

  it('shows a visible deactivated cue for an inactive user', () => {
    render(<UserName name="Casey Leaver" isActive={false} />);
    expect(screen.getByText('Casey Leaver')).toBeInTheDocument();
    expect(screen.getByText('Deactivated')).toBeInTheDocument();
  });

  it('treats a missing isActive as active', () => {
    render(<UserName name="Default Active" />);
    expect(screen.queryByText('Deactivated')).not.toBeInTheDocument();
  });
});
