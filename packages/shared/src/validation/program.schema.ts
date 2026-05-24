import { z } from 'zod';
import { ISSUE } from '../constants';
import { IssueSeverity, IssueStatus, Visibility } from '../enums';

export const createIssueEntrySchema = z.object({
  title: z.string().min(ISSUE.TITLE_MIN_LENGTH).max(ISSUE.TITLE_MAX_LENGTH),
  description: z.string().min(ISSUE.DESCRIPTION_MIN_LENGTH).max(ISSUE.DESCRIPTION_MAX_LENGTH),
  severity: z.nativeEnum(IssueSeverity).default(IssueSeverity.MEDIUM),
  visibility: z.nativeEnum(Visibility).default(Visibility.MANAGER_ONLY),
  tags: z
    .array(z.string().max(ISSUE.TAG_MAX_LENGTH).regex(/^[a-zA-Z0-9-]+$/))
    .max(ISSUE.MAX_TAGS)
    .optional(),
});

export const updateIssueEntrySchema = z.object({
  title: z.string().min(ISSUE.TITLE_MIN_LENGTH).max(ISSUE.TITLE_MAX_LENGTH).optional(),
  description: z.string().min(ISSUE.DESCRIPTION_MIN_LENGTH).max(ISSUE.DESCRIPTION_MAX_LENGTH).optional(),
  severity: z.nativeEnum(IssueSeverity).optional(),
  status: z.nativeEnum(IssueStatus).optional(),
  resolution_note: z.string().max(ISSUE.RESOLUTION_MAX_LENGTH).optional(),
  visibility: z.nativeEnum(Visibility).optional(),
  tags: z
    .array(z.string().max(ISSUE.TAG_MAX_LENGTH).regex(/^[a-zA-Z0-9-]+$/))
    .max(ISSUE.MAX_TAGS)
    .optional(),
});

export type CreateIssueEntrySchema = z.infer<typeof createIssueEntrySchema>;
export type UpdateIssueEntrySchema = z.infer<typeof updateIssueEntrySchema>;
