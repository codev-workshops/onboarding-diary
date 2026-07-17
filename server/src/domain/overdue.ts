import { DONE_TASK_STATUS } from './enums.js';

/** Truncates a date to the start of its UTC calendar day. */
function utcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * A task is overdue when its due date falls on a UTC calendar day strictly before
 * today and it is not yet complete (docs/ASSUMPTIONS.md §18). Due dates are
 * date-only, so a task due today is not overdue; tasks without a due date never are.
 */
export function isTaskOverdue(
  task: { dueDate: Date | null; status: string },
  now: Date = new Date(),
): boolean {
  if (!task.dueDate) return false;
  if (task.status === DONE_TASK_STATUS) return false;
  return utcDay(task.dueDate) < utcDay(now);
}
