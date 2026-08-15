import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/test-utils';
import type { Checklist } from '../../shared/types';
import { OnboardingChecklist } from './onboarding-checklist';

const checklist: Checklist = {
  total: 3,
  completed: 1,
  inProgress: 1,
  pending: 1,
  progressPercent: 33,
  items: [
    { id: 1, title: 'Laptop setup', category: 'Setup', date: '2026-01-05', state: 'Completed', isBlocked: false },
    { id: 2, title: 'Team intro', category: 'Training', date: '2026-01-06', state: 'InProgress', isBlocked: true },
    { id: 3, title: 'First ticket', category: 'Development', date: '2026-01-07', state: 'Pending', isBlocked: false },
  ],
};

describe('OnboardingChecklist', () => {
  it('groups items by state and shows overall progress', () => {
    renderWithProviders(<OnboardingChecklist checklist={checklist} />);

    expect(screen.getByText('33%')).toBeInTheDocument();
    expect(screen.getByText('1 completed')).toBeInTheDocument();
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(screen.getByText('Blocked')).toBeInTheDocument();
    expect(screen.getByText('First ticket')).toBeInTheDocument();
  });

  it('shows an empty state when nothing is logged', () => {
    renderWithProviders(
      <OnboardingChecklist
        checklist={{ total: 0, completed: 0, inProgress: 0, pending: 0, progressPercent: 0, items: [] }}
      />,
    );

    expect(screen.getByText('No checklist items yet')).toBeInTheDocument();
  });
});
