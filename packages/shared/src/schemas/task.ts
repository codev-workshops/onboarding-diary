import { z } from 'zod';

import { TEXT_MAX_LENGTH, TITLE_MAX_LENGTH } from '../constants.js';
import {
  DEFAULT_TASK_CATEGORY,
  DEFAULT_TASK_PRIORITY,
  DEFAULT_TASK_STATUS,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskCategory,
  type TaskPriority,
  type TaskStatus,
} from '../enums.js';
import {
  calendarDate,
  enumListFilter,
  optionalText,
  paginationQuery,
  pastOrPresentCalendarDate,
  trimmedNonEmptyString,
  uuid,
} from '../primitives.js';

const taskFields = {
  entryDate: pastOrPresentCalendarDate,
  title: trimmedNonEmptyString(TITLE_MAX_LENGTH),
  description: optionalText(TEXT_MAX_LENGTH),
  category: z.enum(TASK_CATEGORIES),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
};

export const createTaskBody = z.object({
  ...taskFields,
  description: taskFields.description.optional(),
  category: taskFields.category.default(DEFAULT_TASK_CATEGORY),
  status: taskFields.status.default(DEFAULT_TASK_STATUS),
  priority: taskFields.priority.default(DEFAULT_TASK_PRIORITY),
});

export const updateTaskBody = z.object(taskFields).partial();

export const listTasksQuery = paginationQuery.extend({
  ownerId: uuid.optional(),
  category: enumListFilter(TASK_CATEGORIES).optional(),
  status: enumListFilter(TASK_STATUSES).optional(),
  priority: enumListFilter(TASK_PRIORITIES).optional(),
  from: calendarDate.optional(),
  to: calendarDate.optional(),
});

export type CreateTaskBody = z.infer<typeof createTaskBody>;
export type UpdateTaskBody = z.infer<typeof updateTaskBody>;
export type ListTasksQuery = z.infer<typeof listTasksQuery>;

export type TaskEntryDto = {
  id: string;
  ownerId: string;
  entryDate: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  updatedAt: string;
};
