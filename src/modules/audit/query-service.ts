import type { Prisma, UserRole } from '@prisma/client';

import type { AuditLogQuery } from '@/src/modules/audit/schemas';
import { assertRole } from '@/src/modules/authz/policy';
import type { Actor } from '@/src/modules/authz/scope';
import { skipFor, toPage, type Page } from '@/src/modules/entries/paging';
import { prisma } from '@/src/shared/db/prisma';

export type AuditLogView = {
  id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  actor: { id: string; full_name: string; role: UserRole } | null;
  target: { id: string; full_name: string } | null;
  before: unknown;
  after: unknown;
  ip: string | null;
  request_id: string | null;
  created_at: string;
};

const auditSelect = {
  id: true,
  action: true,
  entityType: true,
  entityId: true,
  actorRole: true,
  before: true,
  after: true,
  ip: true,
  requestId: true,
  createdAt: true,
  actor: { select: { id: true, fullName: true, role: true } },
  target: { select: { id: true, fullName: true } },
} satisfies Prisma.AuditLogSelect;

type AuditRow = Prisma.AuditLogGetPayload<{ select: typeof auditSelect }>;

/**
 * US-75. Admin-only, and deliberately the *only* read of this table: the audit
 * log records who could see whose diary, so a manager reading it would defeat
 * the scope rules it exists to police. The rows themselves are already
 * minimised at write time (§22.3), so nothing here has to redact a second time.
 */
export async function listAuditLogs(actor: Actor, query: AuditLogQuery): Promise<Page<AuditLogView>> {
  assertRole(actor, ['ADMIN']);

  const where: Prisma.AuditLogWhereInput = {
    actorUserId: query.actor_user_id,
    targetUserId: query.target_user_id,
    action: query.action,
    entityType: query.entity_type,
    ...(query.date_from || query.date_to
      ? {
          createdAt: {
            ...(query.date_from ? { gte: query.date_from } : {}),
            // `date_to` names a day, and the rows carry a timestamp: the range
            // is inclusive of everything that happened on it.
            ...(query.date_to ? { lt: new Date(query.date_to.getTime() + 86_400_000) } : {}),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: skipFor(query),
      take: query.page_size,
      select: auditSelect,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return toPage(rows, total, query, toAuditLogView);
}

/** The distinct actions present, so the filter offers what the table contains. */
export async function listAuditActions(actor: Actor): Promise<string[]> {
  assertRole(actor, ['ADMIN']);

  const rows = await prisma.auditLog.findMany({
    distinct: ['action'],
    orderBy: [{ action: 'asc' }],
    select: { action: true },
  });

  return rows.map((row) => row.action);
}

function toAuditLogView(row: AuditRow): AuditLogView {
  return {
    // `id` is a bigint, which JSON cannot carry.
    id: row.id.toString(),
    action: row.action,
    entity_type: row.entityType,
    entity_id: row.entityId,
    actor: row.actor ? { id: row.actor.id, full_name: row.actor.fullName, role: row.actor.role } : null,
    target: row.target ? { id: row.target.id, full_name: row.target.fullName } : null,
    before: row.before ?? null,
    after: row.after ?? null,
    ip: row.ip,
    request_id: row.requestId,
    created_at: row.createdAt.toISOString(),
  };
}
