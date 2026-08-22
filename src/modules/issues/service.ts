import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import type { Actor } from '@/src/modules/authz/scope';
import { orderByWithTiebreak, skipFor, toPage, type Page } from '@/src/modules/entries/paging';
import { issueRepository } from '@/src/modules/entries/repositories';
import { toIssueDto, type IssueDto, type IssueRow } from '@/src/modules/issues/dto';
import {
  CLOSING_STATUSES,
  createIssueSchema,
  sortColumn,
  updateIssueSchema,
  type ListIssuesQuery,
} from '@/src/modules/issues/schemas';
import { AppError } from '@/src/shared/http/errors';

function issueFilters(query: ListIssuesQuery): Prisma.IssueEntryWhereInput[] {
  const filters: Prisma.IssueEntryWhereInput[] = [];

  if (query.date_from || query.date_to) {
    filters.push({
      entryDate: {
        ...(query.date_from && { gte: query.date_from }),
        ...(query.date_to && { lte: query.date_to }),
      },
    });
  }
  if (query.status) filters.push({ status: { in: query.status } });
  if (query.severity) filters.push({ severity: { in: query.severity } });
  if (query.q) {
    filters.push({
      OR: [
        { title: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ],
    });
  }

  return filters;
}

export async function listIssues(actor: Actor, query: ListIssuesQuery): Promise<Page<IssueDto>> {
  const options = { ownerId: query.owner_id, filters: issueFilters(query) };

  const [rows, total] = await Promise.all([
    issueRepository.list(actor, {
      ...options,
      orderBy: orderByWithTiebreak(sortColumn(query.sort), query.order),
      skip: skipFor(query),
      take: query.page_size,
    }),
    issueRepository.count(actor, options),
  ]);

  return toPage(rows, total, query, toIssueDto);
}

export async function getIssue(actor: Actor, id: string): Promise<IssueDto> {
  return toIssueDto(await issueRepository.findByIdOrThrow(actor, id));
}

export async function createIssue(actor: Actor, body: z.infer<typeof createIssueSchema>): Promise<IssueDto> {
  const ownerId = body.owner_id ?? actor.id;
  const closing = CLOSING_STATUSES.includes(body.status);

  const row = await issueRepository.create(actor, ownerId, {
    ownerId,
    entryDate: body.entry_date,
    title: body.title,
    description: body.description,
    severity: body.severity,
    status: body.status,
    resolutionNotes: body.resolution_notes ?? null,
    // C2: the DB requires a resolution timestamp on a closed issue but permits
    // reopening, so the stamp is written on the way in and cleared on the way out.
    resolvedAt: closing ? new Date() : null,
    updatedById: actor.id,
  });

  return toIssueDto(row);
}

export async function updateIssue(
  actor: Actor,
  id: string,
  body: z.infer<typeof updateIssueSchema>
): Promise<IssueDto> {
  const { expected_version, ...fields } = body;

  /**
   * Change keys are the persisted column names, because the policy allow-list
   * (`status`, `resolutionNotes`) is expressed in those terms; translating here
   * keeps the wire format free to differ from the schema.
   */
  const changes: Prisma.IssueEntryUncheckedUpdateInput = {
    ...(fields.entry_date !== undefined && { entryDate: fields.entry_date }),
    ...(fields.title !== undefined && { title: fields.title }),
    ...(fields.description !== undefined && { description: fields.description }),
    ...(fields.severity !== undefined && { severity: fields.severity }),
    ...(fields.status !== undefined && { status: fields.status }),
    ...(fields.resolution_notes !== undefined && { resolutionNotes: fields.resolution_notes ?? null }),
  };

  const row = await issueRepository.update(
    actor,
    id,
    changes,
    (existing: IssueRow) => {
      const status = fields.status ?? existing.status;
      const resolutionNotes =
        fields.resolution_notes !== undefined ? (fields.resolution_notes ?? null) : existing.resolutionNotes;

      if (CLOSING_STATUSES.includes(status) && !resolutionNotes) {
        throw new AppError(
          'VALIDATION_ERROR',
          'Resolution notes are required to resolve or close an issue.',
          [{ field: 'resolution_notes', code: 'REQUIRED' }]
        );
      }

      const data: Prisma.IssueEntryUncheckedUpdateInput = {
        ...changes,
        version: { increment: 1 },
        updatedById: actor.id,
      };

      if (status !== existing.status) {
        data.resolvedAt = CLOSING_STATUSES.includes(status) ? new Date() : null;
      }

      return data;
    },
    { expectedVersion: expected_version }
  );

  return toIssueDto(row);
}

export async function deleteIssue(actor: Actor, id: string): Promise<void> {
  await issueRepository.softDelete(actor, id, (deletedAt) => ({ deletedAt, updatedById: actor.id }));
}
