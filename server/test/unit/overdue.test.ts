import { describe, expect, it } from 'vitest';
import { dayInZone, isTaskOverdue } from '../../src/domain/overdue.js';

const now = new Date('2026-06-15T12:00:00.000Z');
const past = new Date('2026-06-10T00:00:00.000Z');
const future = new Date('2026-06-20T00:00:00.000Z');

describe('isTaskOverdue', () => {
  it('is false when there is no due date', () => {
    expect(isTaskOverdue({ dueDate: null, status: 'To Do' }, 'UTC', now)).toBe(false);
  });

  it('is true when past due and not done', () => {
    expect(isTaskOverdue({ dueDate: past, status: 'To Do' }, 'UTC', now)).toBe(true);
    expect(isTaskOverdue({ dueDate: past, status: 'In Progress' }, 'UTC', now)).toBe(true);
  });

  it('is false when past due but completed', () => {
    expect(isTaskOverdue({ dueDate: past, status: 'Done' }, 'UTC', now)).toBe(false);
  });

  it('is false when the due date is in the future', () => {
    expect(isTaskOverdue({ dueDate: future, status: 'To Do' }, 'UTC', now)).toBe(false);
  });

  it('is false when due today (date-only UTC semantics)', () => {
    const dueToday = new Date('2026-06-15T00:00:00.000Z');
    expect(isTaskOverdue({ dueDate: dueToday, status: 'To Do' }, 'UTC', now)).toBe(false);
  });

  it('respects the owner timezone at day boundaries', () => {
    // 2026-06-16T02:00Z is still 2026-06-15 in New York but already 2026-06-16 in UTC.
    const nowUtc = new Date('2026-06-16T02:00:00.000Z');
    const dueDate = new Date('2026-06-15T00:00:00.000Z');
    expect(isTaskOverdue({ dueDate, status: 'To Do' }, 'America/New_York', nowUtc)).toBe(false);
    expect(isTaskOverdue({ dueDate, status: 'To Do' }, 'UTC', nowUtc)).toBe(true);
  });
});

describe('dayInZone', () => {
  it('formats a UTC instant into the target timezone calendar day', () => {
    const instant = new Date('2026-06-16T02:00:00.000Z');
    expect(dayInZone(instant, 'UTC')).toBe('2026-06-16');
    expect(dayInZone(instant, 'America/New_York')).toBe('2026-06-15');
    expect(dayInZone(instant, 'Asia/Tokyo')).toBe('2026-06-16');
  });
});
