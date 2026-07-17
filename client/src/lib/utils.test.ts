import { describe, expect, it } from 'vitest';
import {
  formatDateTime,
  formatRelativeTime,
  formatTimezone,
  isTaskOverdue,
} from './utils';

const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

describe('isTaskOverdue', () => {
  it('is false without a due date', () => {
    expect(isTaskOverdue({ dueDate: null, status: 'To Do' })).toBe(false);
  });

  it('is true when past due and not done', () => {
    expect(isTaskOverdue({ dueDate: yesterday, status: 'In Progress' })).toBe(true);
  });

  it('is false when done', () => {
    expect(isTaskOverdue({ dueDate: yesterday, status: 'Done' })).toBe(false);
  });

  it('is false when due in the future', () => {
    expect(isTaskOverdue({ dueDate: tomorrow, status: 'To Do' })).toBe(false);
  });

  it('is false when due today (date-only UTC semantics)', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(isTaskOverdue({ dueDate: today, status: 'To Do' })).toBe(false);
  });

  it('honours the provided timezone for a valid IANA zone', () => {
    // A task due long ago is overdue regardless of timezone.
    const longAgo = '2020-01-01';
    expect(isTaskOverdue({ dueDate: longAgo, status: 'To Do' }, 'Asia/Tokyo')).toBe(true);
    expect(isTaskOverdue({ dueDate: longAgo, status: 'To Do' }, 'America/Los_Angeles')).toBe(true);
  });
});

describe('formatRelativeTime', () => {
  const now = new Date('2026-07-17T12:00:00Z');

  it('reports recent times in friendly units', () => {
    expect(formatRelativeTime(new Date('2026-07-17T11:59:40Z'), now)).toBe('just now');
    expect(formatRelativeTime(new Date('2026-07-17T11:55:00Z'), now)).toBe('5m ago');
    expect(formatRelativeTime(new Date('2026-07-17T09:00:00Z'), now)).toBe('3h ago');
    expect(formatRelativeTime(new Date('2026-07-15T12:00:00Z'), now)).toBe('2d ago');
  });

  it('falls back to an absolute date beyond a week', () => {
    expect(formatRelativeTime(new Date('2026-06-01T12:00:00Z'), now)).toBe('2026-06-01');
  });
});

describe('formatDateTime', () => {
  it('produces a non-empty medium/short string', () => {
    expect(formatDateTime('2026-07-17T12:00:00Z')).toMatch(/2026/);
  });
});

describe('formatTimezone', () => {
  it('appends the UTC offset for a valid zone', () => {
    expect(formatTimezone('Asia/Kolkata')).toContain('Asia/Kolkata');
    expect(formatTimezone('Asia/Kolkata')).toMatch(/UTC\+5:30/);
  });

  it('returns the raw value for an unknown zone and empty for blank', () => {
    expect(formatTimezone('Not/AZone')).toBe('Not/AZone');
    expect(formatTimezone('')).toBe('');
  });
});
