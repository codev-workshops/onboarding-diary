import { earliestEntryDate } from './dates';
import { enumColor, enumLabel } from './labels';

describe('labels', () => {
  it('formats enum constants for display', () => {
    expect(enumLabel('IN_PROGRESS')).toBe('In progress');
    expect(enumLabel('CRITICAL')).toBe('Critical');
  });

  it('maps statuses to chip colours', () => {
    expect(enumColor('COMPLETED')).toBe('success');
    expect(enumColor('CRITICAL')).toBe('error');
    expect(enumColor('UNKNOWN')).toBe('default');
  });

  it('computes the earliest entry date across month boundaries', () => {
    expect(earliestEntryDate('2026-03-01')).toBe('2026-01-30');
  });
});
