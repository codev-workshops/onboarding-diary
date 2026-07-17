import { describe, expect, it } from 'vitest';
import { isTaskOverdue } from './utils';

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
