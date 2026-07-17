import { describe, expect, it } from 'vitest';
import { isTaskOverdue } from '../../src/domain/overdue.js';

const now = new Date('2026-06-15T12:00:00.000Z');
const past = new Date('2026-06-10T12:00:00.000Z');
const future = new Date('2026-06-20T12:00:00.000Z');

describe('isTaskOverdue', () => {
  it('is false when there is no due date', () => {
    expect(isTaskOverdue({ dueDate: null, status: 'To Do' }, now)).toBe(false);
  });

  it('is true when past due and not done', () => {
    expect(isTaskOverdue({ dueDate: past, status: 'To Do' }, now)).toBe(true);
    expect(isTaskOverdue({ dueDate: past, status: 'In Progress' }, now)).toBe(true);
  });

  it('is false when past due but completed', () => {
    expect(isTaskOverdue({ dueDate: past, status: 'Done' }, now)).toBe(false);
  });

  it('is false when the due date is in the future', () => {
    expect(isTaskOverdue({ dueDate: future, status: 'To Do' }, now)).toBe(false);
  });
});
