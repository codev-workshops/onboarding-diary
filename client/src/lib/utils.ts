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

/**
 * Formats a stored UTC timestamp as a compact, friendly local string, e.g.
 * "Jul 17, 2026, 5:20 PM". Used for comment/activity timestamps in place of raw
 * `toLocaleString()` output.
 */
export function formatDateTime(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

/**
 * Relative time from now for a UTC timestamp, e.g. "just now", "5m ago", "2d ago".
 * Falls back to an absolute date beyond a week for stable, accessible context.
 */
export function formatRelativeTime(value: string | Date, now: Date = new Date()): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  const diffMs = now.getTime() - d.getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 45) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day <= 7) return `${day}d ago`;
  return toDateInput(d);
}

/**
 * Renders an IANA timezone with its current UTC offset for the Admin user list,
 * e.g. "Asia/Kolkata (UTC+5:30)". Returns the raw value if it cannot be resolved.
 */
export function formatTimezone(timeZone: string): string {
  if (!timeZone) return '';
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date());
    const offset = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
    return offset ? `${timeZone} (${offset.replace('GMT', 'UTC')})` : timeZone;
  } catch {
    return timeZone;
  }
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
