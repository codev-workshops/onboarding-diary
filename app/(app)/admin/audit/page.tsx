import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

import { AuditLogTable } from '@/components/admin/audit-log-table';
import { requireCurrentUser } from '@/src/modules/auth/current-user';
import { listAuditActions, listAuditLogs } from '@/src/modules/audit/query-service';
import { auditLogQuerySchema } from '@/src/modules/audit/schemas';
import { parseSearchParams } from '@/src/modules/entries/schemas';

export const metadata: Metadata = { title: 'Audit log | Onboarding Diary' };
export const dynamic = 'force-dynamic';

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/**
 * US-75. Read-only by construction: the table is append-only in the database,
 * and this page has no write path to it.
 */
export default async function AuditLogPage({ searchParams }: PageProps) {
  const actor = await requireCurrentUser();

  if (actor.role !== 'ADMIN') notFound();

  const query = parseSearchParams(auditLogQuerySchema, await searchParams);
  const [page, actions] = await Promise.all([listAuditLogs(actor, query), listAuditActions(actor)]);

  return <AuditLogTable page={page} actions={actions} query={query} />;
}
