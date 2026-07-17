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
 * A task is overdue when it has a due date in the past and is not yet done
 * (docs/ASSUMPTIONS.md §18). Mirrors the server-side `isTaskOverdue`.
 */
export function isTaskOverdue(task: { dueDate: string | null; status: string }): boolean {
  if (!task.dueDate) return false;
  if (task.status === 'Done') return false;
  return new Date(task.dueDate).getTime() < Date.now();
}
