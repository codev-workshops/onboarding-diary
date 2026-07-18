import { DONE_TASK_STATUS } from './enums.js';

/**
 * Formats a date as a `YYYY-MM-DD` calendar day in the given IANA timezone.
 * `en-CA` yields ISO-ordered date parts, which compare correctly as strings.
 */
export function dayInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * A task is overdue when its (date-only) due day is strictly before "today" in the
 * owner's timezone and it is not yet complete (docs/ASSUMPTIONS.md §18, §20).
 *
 * Due dates are stored as midnight UTC of the chosen calendar day, so the due day
 * is read back in UTC; "today" is evaluated in the owner's timezone so end-of-day
 * lands at local midnight. A task due today is therefore not overdue, and tasks
 * without a due date never are.
 */
export function isTaskOverdue(
  task: { dueDate: Date | null; status: string },
  timeZone = 'UTC',
  now: Date = new Date(),
): boolean {
  if (!task.dueDate) return false;
  if (task.status === DONE_TASK_STATUS) return false;
  return dayInZone(task.dueDate, 'UTC') < dayInZone(now, timeZone);
}
