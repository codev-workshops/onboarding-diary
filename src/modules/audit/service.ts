import type { Prisma, PrismaClient } from '@prisma/client';

import { prisma } from '@/src/shared/db/prisma';
import { currentRequestContext } from '@/src/shared/http/request-context';

/**
 * The six actions kept from §22.1 (O2). Each one answers a security question
 * that the entry tables cannot: who was denied, who wrote to somebody else's
 * diary, who read a private note, who changed a role or a reporting line, and
 * what was exported.
 */
export type AuditAction =
  | 'AUTHZ.DENIED'
  | 'ENTRY.CROSS_USER_UPDATED'
  | 'ENTRY.READ_PRIVILEGED'
  | 'USER.ROLE_CHANGED'
  | 'USER.MANAGER_CHANGED'
  | 'REPORT.GENERATED';

export type AuditInput = {
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  targetUserId?: string | null;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

/** Anything the caller may run an audit write inside — the client or a transaction. */
export type AuditClient = Pick<PrismaClient, 'auditLog'> | Prisma.TransactionClient;

const MAX_VALUE_LENGTH = 120;

/**
 * Writes one audit row. Pass the transaction client for data changes so the
 * change and its record commit together (§22.3) — an audited write that lost
 * its audit row would be worse than no audit at all.
 */
export async function recordAudit(input: AuditInput, client: AuditClient = prisma): Promise<void> {
  const context = currentRequestContext();

  await client.auditLog.create({
    data: {
      actorUserId: context?.actor?.id ?? null,
      actorRole: context?.actor?.role ?? null,
      action: input.action,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      targetUserId: input.targetUserId ?? null,
      before: redact(input.before),
      after: redact(input.after),
      ip: context?.ip ?? null,
      userAgent: context?.userAgent ?? null,
      requestId: context?.requestId ?? null,
    },
  });
}

/**
 * Authentication and authorization events are written outside the transaction
 * and must never turn a 403 into a 500 (§22.3), so failures are logged and
 * swallowed.
 */
export function recordAuditBestEffort(input: AuditInput): void {
  void recordAudit(input).catch((error: unknown) => {
    console.error(`Audit write failed for ${input.action}`, error);
  });
}

/**
 * DB8: the audit table must not become a second copy of the diary. Long text is
 * reduced to its length, so a row records *that* a description changed and by
 * how much, never its contents.
 */
function redact(record: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined {
  if (!record) return undefined;

  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === 'string' && value.length > MAX_VALUE_LENGTH) {
      output[key] = { redacted: true, length: value.length };
    } else if (value instanceof Date) {
      output[key] = value.toISOString();
    } else {
      output[key] = value ?? null;
    }
  }
  return output as Prisma.InputJsonValue;
}
