import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import type { Actor } from '@/src/modules/authz/scope';
import { toFeedbackDto, type FeedbackDto } from '@/src/modules/feedback/dto';
import {
  createFeedbackSchema,
  sortColumn,
  updateFeedbackSchema,
  type ListFeedbackQuery,
} from '@/src/modules/feedback/schemas';
import { orderByWithTiebreak, skipFor, toPage, type Page } from '@/src/modules/entries/paging';
import { feedbackRepository } from '@/src/modules/entries/repositories';

function feedbackFilters(query: ListFeedbackQuery): Prisma.FeedbackEntryWhereInput[] {
  const filters: Prisma.FeedbackEntryWhereInput[] = [];

  if (query.date_from || query.date_to) {
    filters.push({
      entryDate: {
        ...(query.date_from && { gte: query.date_from }),
        ...(query.date_to && { lte: query.date_to }),
      },
    });
  }
  if (query.type) filters.push({ type: { in: query.type } });
  // A visibility filter can only ever narrow: the ADMIN_ONLY predicate is
  // applied by the repository and lives outside the `AND` this feeds.
  if (query.visibility) filters.push({ visibility: { in: query.visibility } });
  if (query.q) {
    filters.push({
      OR: [
        { subject: { contains: query.q, mode: 'insensitive' } },
        { details: { contains: query.q, mode: 'insensitive' } },
      ],
    });
  }

  return filters;
}

export async function listFeedback(actor: Actor, query: ListFeedbackQuery): Promise<Page<FeedbackDto>> {
  const options = { ownerId: query.owner_id, filters: feedbackFilters(query) };

  const [rows, total] = await Promise.all([
    feedbackRepository.list(actor, {
      ...options,
      orderBy: orderByWithTiebreak(sortColumn(query.sort), query.order),
      skip: skipFor(query),
      take: query.page_size,
    }),
    feedbackRepository.count(actor, options),
  ]);

  return toPage(rows, total, query, toFeedbackDto);
}

export async function getFeedback(actor: Actor, id: string): Promise<FeedbackDto> {
  return toFeedbackDto(await feedbackRepository.findByIdOrThrow(actor, id));
}

export async function createFeedback(
  actor: Actor,
  body: z.infer<typeof createFeedbackSchema>
): Promise<FeedbackDto> {
  const ownerId = body.owner_id ?? actor.id;

  const row = await feedbackRepository.create(actor, ownerId, {
    ownerId,
    entryDate: body.entry_date,
    subject: body.subject,
    type: body.type,
    details: body.details,
    visibility: body.visibility,
    updatedById: actor.id,
  });

  return toFeedbackDto(row);
}

export async function updateFeedback(
  actor: Actor,
  id: string,
  body: z.infer<typeof updateFeedbackSchema>
): Promise<FeedbackDto> {
  const { expected_version, ...fields } = body;

  const changes: Prisma.FeedbackEntryUncheckedUpdateInput = {
    ...(fields.entry_date !== undefined && { entryDate: fields.entry_date }),
    ...(fields.subject !== undefined && { subject: fields.subject }),
    ...(fields.type !== undefined && { type: fields.type }),
    ...(fields.details !== undefined && { details: fields.details }),
    ...(fields.visibility !== undefined && { visibility: fields.visibility }),
  };

  const row = await feedbackRepository.update(
    actor,
    id,
    changes,
    () => ({ ...changes, version: { increment: 1 }, updatedById: actor.id }),
    { expectedVersion: expected_version }
  );

  return toFeedbackDto(row);
}

export async function deleteFeedback(actor: Actor, id: string): Promise<void> {
  await feedbackRepository.softDelete(actor, id, (deletedAt) => ({ deletedAt, updatedById: actor.id }));
}
