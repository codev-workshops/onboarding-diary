import { z } from 'zod';

import { TEXT_MAX_LENGTH, TITLE_MAX_LENGTH } from '../constants.js';
import {
  DEFAULT_ISSUE_SEVERITY,
  DEFAULT_ISSUE_STATUS,
  ISSUE_SEVERITIES,
  ISSUE_STATUSES,
  type IssueSeverity,
  type IssueStatus,
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

const issueFields = {
  entryDate: pastOrPresentCalendarDate,
  title: trimmedNonEmptyString(TITLE_MAX_LENGTH),
  description: optionalText(TEXT_MAX_LENGTH),
  severity: z.enum(ISSUE_SEVERITIES),
  status: z.enum(ISSUE_STATUSES),
  resolutionNotes: optionalText(TEXT_MAX_LENGTH),
};

export const createIssueBody = z.object({
  ...issueFields,
  description: issueFields.description.optional(),
  severity: issueFields.severity.default(DEFAULT_ISSUE_SEVERITY),
  status: issueFields.status.default(DEFAULT_ISSUE_STATUS),
  resolutionNotes: issueFields.resolutionNotes.optional(),
});

export const updateIssueBody = z.object(issueFields).partial();

export const listIssuesQuery = paginationQuery.extend({
  ownerId: uuid.optional(),
  severity: enumListFilter(ISSUE_SEVERITIES).optional(),
  status: enumListFilter(ISSUE_STATUSES).optional(),
  from: calendarDate.optional(),
  to: calendarDate.optional(),
});

export type CreateIssueBody = z.infer<typeof createIssueBody>;
export type UpdateIssueBody = z.infer<typeof updateIssueBody>;
export type ListIssuesQuery = z.infer<typeof listIssuesQuery>;

export type IssueEntryDto = {
  id: string;
  ownerId: string;
  entryDate: string;
  title: string;
  description: string | null;
  severity: IssueSeverity;
  status: IssueStatus;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
};
