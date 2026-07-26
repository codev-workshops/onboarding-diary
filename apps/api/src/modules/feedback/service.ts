import type {
  CreateFeedbackBody,
  FeedbackNoteDto,
  ListFeedbackQuery,
  PaginationMeta,
  UpdateFeedbackBody,
} from '@onboarding-diary/shared';

import { assertEntryAccess, type Caller } from '../../access/entryAccess.js';
import { entryDateFilter, inFilter } from '../../lib/entryFilters.js';
import { NotFoundError } from '../../lib/errors.js';
import { buildMeta, ENTRY_ORDER_BY, toPrismaPage, type PageParams } from '../../lib/pagination.js';
import type { Db } from '../../lib/prisma.js';
import { toFeedbackDto } from '../../serializers/entries.js';

function toDate(entryDate: string): Date {
  return new Date(`${entryDate}T00:00:00.000Z`);
}

export async function createFeedback(
  db: Db,
  caller: Caller,
  body: CreateFeedbackBody,
): Promise<FeedbackNoteDto> {
  const feedback = await db.feedbackNote.create({
    data: {
      ownerId: caller.id,
      entryDate: toDate(body.entryDate),
      subject: body.subject,
      type: body.type,
      details: body.details ?? null,
    },
  });
  return toFeedbackDto(feedback);
}

export async function readFeedback(db: Db, caller: Caller, id: string): Promise<FeedbackNoteDto> {
  const feedback = await db.feedbackNote.findUnique({ where: { id } });
  if (feedback === null) throw new NotFoundError('Feedback note not found');
  await assertEntryAccess(db, caller, feedback.ownerId, 'read');
  return toFeedbackDto(feedback);
}

export async function updateFeedback(
  db: Db,
  caller: Caller,
  id: string,
  body: UpdateFeedbackBody,
): Promise<FeedbackNoteDto> {
  const existing = await db.feedbackNote.findUnique({ where: { id } });
  if (existing === null) throw new NotFoundError('Feedback note not found');
  await assertEntryAccess(db, caller, existing.ownerId, 'write');

  const updated = await db.feedbackNote.update({
    where: { id },
    data: {
      ...(body.entryDate === undefined ? {} : { entryDate: toDate(body.entryDate) }),
      ...(body.subject === undefined ? {} : { subject: body.subject }),
      ...(body.type === undefined ? {} : { type: body.type }),
      ...(body.details === undefined ? {} : { details: body.details }),
    },
  });
  return toFeedbackDto(updated);
}

export async function deleteFeedback(db: Db, caller: Caller, id: string): Promise<void> {
  const existing = await db.feedbackNote.findUnique({ where: { id } });
  if (existing === null) throw new NotFoundError('Feedback note not found');
  await assertEntryAccess(db, caller, existing.ownerId, 'write');
  await db.feedbackNote.delete({ where: { id } });
}

export async function listFeedback(
  db: Db,
  caller: Caller,
  query: ListFeedbackQuery,
  page: PageParams,
): Promise<{ data: FeedbackNoteDto[]; meta: PaginationMeta }> {
  const ownerId = await assertEntryAccess(db, caller, query.ownerId, 'read');
  const entryDate = entryDateFilter(query);
  const type = inFilter(query.type);
  const where = {
    ownerId,
    ...(entryDate === undefined ? {} : { entryDate }),
    ...(type === undefined ? {} : { type }),
  };

  const [feedback, total] = await Promise.all([
    db.feedbackNote.findMany({ where, orderBy: ENTRY_ORDER_BY, ...toPrismaPage(page) }),
    db.feedbackNote.count({ where }),
  ]);
  return { data: feedback.map(toFeedbackDto), meta: buildMeta(page, total) };
}
