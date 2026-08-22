import type { FeedbackType, FeedbackVisibility, Prisma } from '@prisma/client';

export const feedbackSelect = {
  id: true,
  ownerId: true,
  entryDate: true,
  subject: true,
  type: true,
  details: true,
  visibility: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: { id: true, fullName: true } },
  updatedBy: { select: { id: true, fullName: true } },
} satisfies Prisma.FeedbackEntrySelect;

export type FeedbackRow = Prisma.FeedbackEntryGetPayload<{ select: typeof feedbackSelect }>;

export type FeedbackDto = {
  id: string;
  owner: { id: string; full_name: string };
  entry_date: string;
  subject: string;
  type: FeedbackType;
  details: string;
  visibility: FeedbackVisibility;
  version: number;
  created_at: string;
  updated_at: string;
  updated_by: { id: string; full_name: string };
};

export function toFeedbackDto(feedback: FeedbackRow): FeedbackDto {
  return {
    id: feedback.id,
    owner: { id: feedback.owner.id, full_name: feedback.owner.fullName },
    entry_date: feedback.entryDate.toISOString().slice(0, 10),
    subject: feedback.subject,
    type: feedback.type,
    details: feedback.details,
    visibility: feedback.visibility,
    version: feedback.version,
    created_at: feedback.createdAt.toISOString(),
    updated_at: feedback.updatedAt.toISOString(),
    updated_by: { id: feedback.updatedBy.id, full_name: feedback.updatedBy.fullName },
  };
}
