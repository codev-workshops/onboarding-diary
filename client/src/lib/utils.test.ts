import { describe, expect, it } from 'vitest';
import { cn, toDateInput } from './utils';

describe('cn', () => {
  it('merges and de-duplicates conflicting tailwind classes', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
    expect(cn('text-sm', false, 'font-bold')).toBe('text-sm font-bold');
  });
});

describe('toDateInput', () => {
  it('formats a date to YYYY-MM-DD', () => {
    expect(toDateInput('2026-01-15T10:30:00.000Z')).toBe('2026-01-15');
  });
});
