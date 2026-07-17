import { DONE_TASK_STATUS } from './enums.js';

/**
 * A task is overdue when it has a due date strictly in the past and it is not yet
 * complete (docs/ASSUMPTIONS.md §18). Due dates are optional, so tasks without a
 * due date are never overdue.
 */
export function isTaskOverdue(
  task: { dueDate: Date | null; status: string },
  now: Date = new Date(),
): boolean {
  if (!task.dueDate) return false;
  if (task.status === DONE_TASK_STATUS) return false;
  return task.dueDate.getTime() < now.getTime();
}
