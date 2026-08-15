import { z } from 'zod';
import { issueSeverities, issueStatuses } from '../../shared/types';

export const issueSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title must be 200 characters or fewer'),
  description: z.string().max(2000, 'Description must be 2000 characters or fewer').optional(),
  severity: z.enum(issueSeverities as [string, ...string[]]),
  status: z.enum(issueStatuses as [string, ...string[]]),
  resolutionNotes: z.string().max(2000, 'Resolution notes must be 2000 characters or fewer').optional(),
});

export type IssueFormValues = z.infer<typeof issueSchema>;
