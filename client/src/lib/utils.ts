import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merges Tailwind class names, de-duplicating conflicting utilities. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Formats an ISO date string as YYYY-MM-DD for display and inputs. */
export function toDateInput(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return d.toISOString().slice(0, 10);
}

/** Formats a date as a `YYYY-MM-DD` calendar day in the given IANA timezone. */
function dayInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * A task is overdue when its (date-only) due day is strictly before "today" in the
 * owner's timezone and is not yet done (docs/ASSUMPTIONS.md §18, §20). Due dates are
 * stored as midnight UTC of the chosen day, so the due day is read back in UTC while
 * "today" is evaluated in the owner's timezone. Mirrors the server-side
 * `isTaskOverdue`; a task due today is not overdue.
 */
export function isTaskOverdue(
  task: { dueDate: string | null; status: string },
  timeZone = 'UTC',
): boolean {
  if (!task.dueDate) return false;
  if (task.status === 'Done') return false;
  return dayInZone(new Date(task.dueDate), 'UTC') < dayInZone(new Date(), timeZone);
}
