import { createCrudHooks } from '../../shared/api/crud';
import type { TaskEntry } from '../../shared/types';
import type { TaskFormValues } from './schema';

export const tasksApi = createCrudHooks<TaskEntry, TaskFormValues>('tasks');
