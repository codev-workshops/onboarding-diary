import * as shared from '@onboarding-diary/shared';
import { describe, expect, it } from 'vitest';

import * as prismaEnums from '../src/generated/prisma/enums.js';

/** The Prisma schema and packages/shared must describe the same enums (TRD 2.3). */
describe('Prisma enum parity', () => {
  it.each([
    ['Role', prismaEnums.Role, shared.ROLES],
    ['TaskCategory', prismaEnums.TaskCategory, shared.TASK_CATEGORIES],
    ['TaskStatus', prismaEnums.TaskStatus, shared.TASK_STATUSES],
    ['TaskPriority', prismaEnums.TaskPriority, shared.TASK_PRIORITIES],
    ['IssueSeverity', prismaEnums.IssueSeverity, shared.ISSUE_SEVERITIES],
    ['IssueStatus', prismaEnums.IssueStatus, shared.ISSUE_STATUSES],
    ['FeedbackType', prismaEnums.FeedbackType, shared.FEEDBACK_TYPES],
  ])('%s matches exactly', (_name, prismaEnum, sharedValues) => {
    expect(Object.values(prismaEnum)).toEqual([...sharedValues]);
  });
});
