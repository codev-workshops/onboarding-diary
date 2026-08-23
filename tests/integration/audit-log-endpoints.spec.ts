/**
 * `GET /audit-logs` (US-75, §12.8) through the real handler against seeded
 * Postgres.
 *
 * The audit log records who read and changed whose diary, so the read itself is
 * a privilege: most of these tests are about who is refused. The rest prove the
 * filters actually narrow the SQL rather than the presentation, and that the
 * rows carry no diary content.
 *
 * Requires a seeded database (`npm run db:reset`). Nothing is cleaned up
 * afterwards because nothing can be: the table is append-only in the database,
 * which is why the fixture actions carry a per-run marker.
 */
import type { UserRole } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';

import { GET as auditLogsGet } from '@/app/api/v1/audit-logs/route';
import { SESSION_COOKIE, signSession } from '@/src/modules/auth/session';
import type { AuditLogView } from '@/src/modules/audit/query-service';
import type { Page } from '@/src/modules/entries/paging';
import { prisma } from '@/src/shared/db/prisma';

const EMAILS = {
  admin: 'admin@onboarding.test',
  manager: 'marcus.bell@onboarding.test',
  recruit: 'priya.sharma@onboarding.test',
} as const;

type Key = keyof typeof EMAILS;
type Json = { data?: unknown; error?: { code: string; message: string; details?: unknown[] } };

const actors = {} as Record<Key, { id: string; role: UserRole; cookie: string }>;
const MARKER = `AUDIT.FIXTURE_${randomUUID().slice(0, 8).toUpperCase()}`;

async function list(as: Key | undefined, query = ''): Promise<{ status: number; json: Json }> {
  const headers: Record<string, string> = {};
  if (as) headers.cookie = actors[as].cookie;

  const response = await auditLogsGet(new Request(`http://localhost/api/v1/audit-logs${query}`, { headers }));
  return { status: response.status, json: (await response.json()) as Json };
}

const page = (json: Json) => json.data as Page<AuditLogView>;

async function seedEvent(input: {
  action: string;
  actor: Key;
  target?: Key;
  entityType?: string;
  createdAt: string;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorUserId: actors[input.actor].id,
      actorRole: actors[input.actor].role,
      action: input.action,
      entityType: input.entityType ?? 'USER',
      targetUserId: input.target ? actors[input.target].id : null,
      after: { marker: MARKER },
      createdAt: new Date(input.createdAt),
    },
    select: { id: true },
  });
}

beforeAll(async () => {
  const rows = await prisma.user.findMany({
    where: { email: { in: Object.values(EMAILS) } },
    select: { id: true, email: true, role: true },
  });

  for (const [key, email] of Object.entries(EMAILS) as [Key, string][]) {
    const row = rows.find((candidate) => candidate.email === email);
    if (!row) throw new Error(`Seed fixture missing: ${email}. Run npm run db:reset.`);
    actors[key] = { id: row.id, role: row.role, cookie: `${SESSION_COOKIE}=${await signSession(row.id)}` };
  }

  await seedEvent({ action: MARKER, actor: 'admin', target: 'recruit', createdAt: '2026-03-01T09:00:00Z' });
  await seedEvent({
    action: `${MARKER}.DENIED`,
    actor: 'manager',
    entityType: 'REQUEST',
    createdAt: '2026-03-05T09:00:00Z',
  });
  await seedEvent({ action: MARKER, actor: 'manager', target: 'recruit', createdAt: '2026-04-10T09:00:00Z' });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('authorization', () => {
  it('refuses an anonymous caller', async () => {
    const response = await list(undefined);
    expect(response.status).toBe(401);
    expect(response.json.error?.code).toBe('UNAUTHENTICATED');
  });

  it.each(['manager', 'recruit'] as const)('refuses a %s with 403 INSUFFICIENT_ROLE', async (as) => {
    const response = await list(as);
    expect(response.status).toBe(403);
    expect(response.json.error?.code).toBe('INSUFFICIENT_ROLE');
    expect(response.json.data).toBeUndefined();
  });

  it('records the refusal it just issued', async () => {
    await list('manager');

    // AUTHZ.DENIED is written best-effort, off the response path, so the row can
    // land just after the handler answers: poll for it rather than race it.
    let denial: { id: bigint } | null = null;
    for (let attempt = 0; attempt < 20 && !denial; attempt += 1) {
      denial = await prisma.auditLog.findFirst({
        where: { actorUserId: actors.manager.id, action: 'AUTHZ.DENIED' },
        orderBy: { id: 'desc' },
        select: { id: true },
      });
      if (!denial) await new Promise((resolve) => setTimeout(resolve, 50));
    }

    expect(denial).not.toBeNull();
  });
});

describe('GET /audit-logs', () => {
  it('lists events newest first for an admin', async () => {
    const response = await list('admin', `?action=${MARKER}`);

    expect(response.status).toBe(200);
    const items = page(response.json).items;
    expect(items).toHaveLength(2);
    expect(items[0].created_at > items[1].created_at).toBe(true);
    expect(items[0].actor?.full_name).toBeTruthy();
    expect(items[0].target?.full_name).toBeTruthy();
  });

  it.each([
    ['action', `?action=${MARKER}.DENIED`, 1],
    ['entity_type', `?entity_type=REQUEST&action=${MARKER}.DENIED`, 1],
    ['date_from', `?action=${MARKER}&date_from=2026-04-01`, 1],
    ['date_to', `?action=${MARKER}&date_to=2026-03-01`, 1],
    ['a range that spans both', `?action=${MARKER}&date_from=2026-03-01&date_to=2026-04-10`, 2],
  ])('filters by %s', async (_label, query, expected) => {
    const response = await list('admin', query);
    expect(response.status).toBe(200);
    expect(page(response.json).items).toHaveLength(expected);
  });

  it('filters by actor and by target independently', async () => {
    const byActor = await list('admin', `?action=${MARKER}&actor_user_id=${actors.manager.id}`);
    expect(page(byActor.json).items.map((row) => row.actor?.id)).toEqual([actors.manager.id]);

    const byTarget = await list('admin', `?action=${MARKER}&target_user_id=${actors.recruit.id}`);
    expect(page(byTarget.json).items.every((row) => row.target?.id === actors.recruit.id)).toBe(true);
    expect(page(byTarget.json).items).toHaveLength(2);
  });

  it('pages the result and reports the total', async () => {
    const first = await list('admin', `?action=${MARKER}&page_size=1`);
    const second = await list('admin', `?action=${MARKER}&page_size=1&page=2`);

    expect(page(first.json).page).toMatchObject({ page: 1, page_size: 1, total: 2, total_pages: 2 });
    expect(page(first.json).items[0].id).not.toBe(page(second.json).items[0].id);
  });

  it('rejects an unknown filter rather than ignoring it', async () => {
    const response = await list('admin', '?owner_id=00000000-0000-4000-8000-000000000000');
    expect(response.status).toBe(422);
    expect(response.json.error?.code).toBe('VALIDATION_ERROR');
  });

  it('carries no diary content — long values were reduced at write time', async () => {
    const response = await list('admin', '?page_size=100');
    const serialised = JSON.stringify(page(response.json).items);

    // Every seeded diary body is longer than the audit redaction ceiling, so a
    // leak would have to show up as one of these titles.
    expect(serialised).not.toContain('Private scribble');

    // A credential, not the word: `/reset-password` is a legitimate path in an
    // AUTHZ.DENIED payload, while the seed password or a bcrypt hash is not.
    expect(serialised).not.toContain('Passw0rd!23');
    expect(serialised).not.toMatch(/\$2[aby]\$/);
    expect(serialised).not.toMatch(
      /"(password|current_password|new_password|temporary_password|password_hash)":\s*"/
    );
  });
});
