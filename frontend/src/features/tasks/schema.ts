import { z } from 'zod';
import { taskCategories, taskPriorities, taskStatuses } from '../../shared/types';

export const taskSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title must be 200 characters or fewer'),
  description: z.string().max(2000, 'Description must be 2000 characters or fewer').optional(),
  category: z.enum(taskCategories as [string, ...string[]]),
  status: z.enum(taskStatuses as [string, ...string[]]),
  priority: z.enum(taskPriorities as [string, ...string[]]),
});

export type TaskFormValues = z.infer<typeof taskSchema>;
