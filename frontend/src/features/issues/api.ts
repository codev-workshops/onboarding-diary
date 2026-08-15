import { createCrudHooks } from '../../shared/api/crud';
import type { IssueEntry } from '../../shared/types';
import type { IssueFormValues } from './schema';

export const issuesApi = createCrudHooks<IssueEntry, IssueFormValues>('issues');
