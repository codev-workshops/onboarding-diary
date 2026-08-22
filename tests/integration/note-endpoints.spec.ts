/**
 * The note endpoints against seeded Postgres, through the real handlers. Notes
 * are the strictest slice in the application: being in a manager's scope buys
 * them nothing, so the interesting assertions are all about a manager being
 * refused their own report's notes — and refused with a 404, so the refusal
 * cannot be used to detect that a note exists at all.
 *
 * Requires a seeded database (`npm run db:reset`); every row this suite writes
 * is removed again in `afterAll`.
 */
import type { UserRole } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DELETE as deleteNote, GET as getNote, PATCH as patchNote } from '@/app/api/v1/notes/[id]/route';
import { GET as listNotesRoute, POST as createNote } from '@/app/api/v1/notes/route';
import { SESSION_COOKIE, signSession } from '@/src/modules/auth/session';
import { prisma } from '@/src/shared/db/prisma';

const EMAILS = {
  admin: 'admin@onboarding.test',
  managerA: 'marcus.bell@onboarding.test',
  recruitA: 'priya.sharma@onboarding.test',
  recruitA2: 'sam.okafor@onboarding.test',
  recruitB: 'aisha.khan@onboarding.test',
  unassigned: 'noah.silva@onboarding.test',
} as const;

type Key = keyof typeof EMAILS;

const users = {} as Record<Key, { id: string; role: UserRole; cookie: string }>;
const createdIds: string[] = [];

type Json = { data?: unknown; error?: { code: string; message: string; details: unknown[] } };

type NotePayload = {
  id: string;
  owner: { id: string };
  title: string;
  content: string;
  tags: string[];
  version: number;
};

async function call(
  handler: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>,
  options: {
    method?: string;
    url: string;
    as?: Key;
    body?: unknown;
    id?: string;
    contentType?: string | null;
  }
): Promise<{ status: number; json: Json }> {
  const headers: Record<string, string> = {};
  if (options.as) headers.cookie = users[options.as].cookie;
  if (options.body !== undefined) headers['content-type'] = options.contentType ?? 'application/json';

  const request = new Request(`http://localhost${options.url}`, {
    method: options.method ?? 'GET',
    headers,
    ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}),
  });

  const response = await handler(request, { params: Promise.resolve({ id: options.id ?? '' }) });
  const json = response.status === 204 ? {} : ((await response.json()) as Json);
  return { status: response.status, json };
}

const list = (options: { url?: string; as?: Key } = {}) =>
  call(listNotesRoute as never, { url: options.url ?? '/api/v1/notes', as: options.as });

const rowsOf = (json: Json) => (json.data as { items: NotePayload[] }).items;

async function seedNote(ownerKey: Key, overrides: Record<string, unknown> = {}): Promise<string> {
  const row = await prisma.noteEntry.create({
    data: {
      ownerId: users[ownerKey].id,
      updatedById: users[ownerKey].id,
      entryDate: new Date('2026-01-15'),
      title: 'Endpoint fixture note',
      content: 'Something the recruit wrote down for themselves.',
      ...overrides,
    },
    select: { id: true },
  });
  createdIds.push(row.id);
  return row.id;
}

beforeAll(async () => {
  const rows = await prisma.user.findMany({
    where: { email: { in: Object.values(EMAILS) } },
    select: { id: true, email: true, role: true },
  });

  for (const [key, email] of Object.entries(EMAILS) as [Key, string][]) {
    const row = rows.find((candidate) => candidate.email === email);
    if (!row) throw new Error(`Seed fixture missing: ${email}. Run npm run db:seed.`);
    users[key] = { id: row.id, role: row.role, cookie: `${SESSION_COOKIE}=${await signSession(row.id)}` };
  }
});

afterAll(async () => {
  await prisma.noteEntry.deleteMany({ where: { id: { in: createdIds } } });
  await prisma.$disconnect();
});

describe('authentication', () => {
  it('refuses an anonymous request rather than falling back to an empty scope', async () => {
    const response = await list();
    expect(response.status).toBe(401);
    expect(response.json.error?.code).toBe('UNAUTHENTICATED');
  });

  it('refuses a well-formed cookie for a deactivated user', async () => {
    const id = users.unassigned.id;
    await prisma.user.update({ where: { id }, data: { isActive: false } });
    try {
      expect((await list({ as: 'unassigned' })).status).toBe(401);
    } finally {
      await prisma.user.update({ where: { id }, data: { isActive: true } });
    }
  });
});

describe('GET /notes — notes never leave their author', () => {
  it('returns only the recruit’s own notes', async () => {
    const response = await list({ as: 'recruitA', url: '/api/v1/notes?page_size=100' });
    expect(response.status).toBe(200);
    expect(rowsOf(response.json).every((row) => row.owner.id === users.recruitA.id)).toBe(true);
  });

  it('shows a manager their own notes and none of their reports’ (AZ-M4)', async () => {
    const reportNote = await seedNote('recruitA', { title: 'Private to the recruit' });
    const ownNote = await seedNote('managerA', { title: 'The manager’s own note' });

    const response = await list({ as: 'managerA', url: '/api/v1/notes?page_size=100' });
    const ids = rowsOf(response.json).map((row) => row.id);

    expect(ids).toContain(ownNote);
    expect(ids).not.toContain(reportNote);
    expect(rowsOf(response.json).every((row) => row.owner.id === users.managerA.id)).toBe(true);
  });

  it('answers 404 when a manager reads a report’s note directly', async () => {
    const id = await seedNote('recruitA');
    const response = await call(getNote as never, { url: `/x/${id}`, as: 'managerA', id });

    expect(response.status).toBe(404);
    expect(response.json.error?.message).not.toContain(id);
  });

  it('answers 404, not 403, when a manager asks for a report’s notes by owner_id', async () => {
    // The 403 out-of-scope answer would confirm the manager–recruit link and
    // imply the notes exist; notes are refused before scope is consulted.
    const response = await list({ as: 'managerA', url: `/api/v1/notes?owner_id=${users.recruitA.id}` });
    expect(response.status).toBe(404);
  });

  it('lets an admin read across owners as a privileged action', async () => {
    const id = await seedNote('recruitA', { title: 'Read by the admin' });
    const response = await list({ as: 'admin', url: '/api/v1/notes?page_size=100' });

    expect(rowsOf(response.json).map((row) => row.id)).toContain(id);
    expect(new Set(rowsOf(response.json).map((row) => row.owner.id)).size).toBeGreaterThan(1);
  });

  it('excludes soft-deleted notes from the owner’s own reads', async () => {
    const id = await seedNote('recruitA', { title: 'Soft deleted', deletedAt: new Date() });
    const response = await list({ as: 'recruitA', url: '/api/v1/notes?page_size=100' });

    expect(rowsOf(response.json).some((row) => row.id === id)).toBe(false);
    expect((await call(getNote as never, { url: `/x/${id}`, as: 'recruitA', id })).status).toBe(404);
  });

  it('never exposes an owner’s email address', async () => {
    const response = await list({ as: 'admin' });
    expect(JSON.stringify(response.json)).not.toContain('@onboarding.test');
  });

  it('answers 404 identically for a missing id and a malformed one', async () => {
    const missing = '00000000-0000-4000-8000-000000000000';
    const absent = await call(getNote as never, { url: `/x/${missing}`, as: 'admin', id: missing });
    const malformed = await call(getNote as never, { url: '/x/nope', as: 'admin', id: 'not-a-uuid' });

    expect(absent.status).toBe(404);
    expect(malformed.status).toBe(404);
    expect(malformed.json.error?.code).toBe(absent.json.error?.code);
  });
});

describe('POST /notes', () => {
  it('creates a note for the caller and normalises its tags', async () => {
    const response = await call(createNote as never, {
      method: 'POST',
      url: '/api/v1/notes',
      as: 'recruitA',
      body: {
        entry_date: '2026-01-20',
        title: 'Where the runbooks live',
        content: 'The deployment runbooks are in the platform wiki, not the repo.',
        tags: ['Access', 'access', 'PLATFORM'],
      },
    });

    expect(response.status).toBe(201);
    const created = response.json.data as NotePayload;
    createdIds.push(created.id);
    expect(created.owner.id).toBe(users.recruitA.id);
    expect(created.tags).toEqual(['access', 'platform']);
  });

  it('refuses a manager writing a note for their own report', async () => {
    const response = await call(createNote as never, {
      method: 'POST',
      url: '/api/v1/notes',
      as: 'managerA',
      body: {
        entry_date: '2026-01-20',
        title: 'Written by the manager',
        content: 'A note authored in somebody else’s private diary.',
        owner_id: users.recruitA.id,
      },
    });

    expect(response.status).toBe(403);
    expect(response.json.error?.code).toBe('INSUFFICIENT_ROLE');
  });

  it('audits an admin writing into somebody else’s diary, in the same transaction', async () => {
    const response = await call(createNote as never, {
      method: 'POST',
      url: '/api/v1/notes',
      as: 'admin',
      body: {
        entry_date: '2026-01-21',
        title: 'Recorded on the recruit’s behalf',
        content: 'Captured during the onboarding review at the recruit’s request.',
        owner_id: users.recruitB.id,
      },
    });

    expect(response.status).toBe(201);
    const created = response.json.data as NotePayload;
    createdIds.push(created.id);

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'ENTRY.CROSS_USER_UPDATED', entityId: created.id },
    });
    expect(audit?.actorUserId).toBe(users.admin.id);
    expect(audit?.targetUserId).toBe(users.recruitB.id);
    expect(audit?.entityType).toBe('NOTE');
  });

  it('rejects an unknown field rather than ignoring it', async () => {
    const response = await call(createNote as never, {
      method: 'POST',
      url: '/api/v1/notes',
      as: 'recruitA',
      body: {
        entry_date: '2026-01-20',
        title: 'Mass assignment attempt',
        content: 'Trying to set fields the server owns.',
        version: 99,
      },
    });

    expect(response.status).toBe(422);
  });

  it('rejects a form-encoded body, so the cookie cannot be driven cross-site', async () => {
    const response = await call(createNote as never, {
      method: 'POST',
      url: '/api/v1/notes',
      as: 'recruitA',
      contentType: 'application/x-www-form-urlencoded',
      body: { entry_date: '2026-01-20', title: 'CSRF attempt', content: 'Long enough to pass.' },
    });
    expect(response.status).toBe(415);
  });

  it('rejects an impossible date, an empty title and more tags than the column allows', async () => {
    const bodies = [
      { entry_date: '2026-02-31', title: 'Impossible date', content: 'Long enough to pass.' },
      { entry_date: '2026-01-20', title: 'no', content: 'Long enough to pass.' },
      {
        entry_date: '2026-01-20',
        title: 'Too many tags',
        content: 'Long enough to pass.',
        tags: Array.from({ length: 11 }, (_, index) => `tag-${index}`),
      },
    ];

    for (const body of bodies) {
      const response = await call(createNote as never, {
        method: 'POST',
        url: '/api/v1/notes',
        as: 'recruitA',
        body,
      });
      expect(response.status).toBe(422);
    }
  });
});

describe('PATCH /notes/{id}', () => {
  it('updates the caller’s own note', async () => {
    const id = await seedNote('recruitA');
    const response = await call(patchNote as never, {
      method: 'PATCH',
      url: `/x/${id}`,
      as: 'recruitA',
      id,
      body: { title: 'Revised after the first week', tags: ['Wiki'] },
    });

    expect(response.status).toBe(200);
    const row = response.json.data as NotePayload;
    expect(row.title).toBe('Revised after the first week');
    expect(row.tags).toEqual(['wiki']);
    expect(row.version).toBe(2);
  });

  it('refuses a manager editing a report’s note with a 404, writing nothing', async () => {
    const id = await seedNote('recruitA', { title: 'Untouched by the manager' });
    const response = await call(patchNote as never, {
      method: 'PATCH',
      url: `/x/${id}`,
      as: 'managerA',
      id,
      body: { title: 'Rewritten by the manager' },
    });

    expect(response.status).toBe(404);
    const after = await prisma.noteEntry.findUniqueOrThrow({ where: { id } });
    expect(after.title).toBe('Untouched by the manager');
  });

  it('rejects an attempt to reassign ownership', async () => {
    const id = await seedNote('recruitA');
    const response = await call(patchNote as never, {
      method: 'PATCH',
      url: `/x/${id}`,
      as: 'recruitA',
      id,
      body: { owner_id: users.recruitA2.id },
    });

    expect(response.status).toBe(422);
    const after = await prisma.noteEntry.findUniqueOrThrow({ where: { id } });
    expect(after.ownerId).toBe(users.recruitA.id);
  });

  it('refuses a stale expected_version with 409 and leaves the row alone', async () => {
    const id = await seedNote('recruitA', { title: 'Concurrently edited' });
    await prisma.noteEntry.update({ where: { id }, data: { version: { increment: 1 } } });

    const response = await call(patchNote as never, {
      method: 'PATCH',
      url: `/x/${id}`,
      as: 'recruitA',
      id,
      body: { title: 'Written over a stale read', expected_version: 1 },
    });

    expect(response.status).toBe(409);
    expect(response.json.error?.code).toBe('VERSION_CONFLICT');
    const after = await prisma.noteEntry.findUniqueOrThrow({ where: { id } });
    expect(after.title).toBe('Concurrently edited');
  });

  it('answers 404 for an invisible note before it considers the version', async () => {
    const id = await seedNote('recruitA');
    const response = await call(patchNote as never, {
      method: 'PATCH',
      url: `/x/${id}`,
      as: 'managerA',
      id,
      body: { title: 'Probing for a note', expected_version: 99 },
    });
    expect(response.status).toBe(404);
  });
});

describe('DELETE /notes/{id}', () => {
  it('soft-deletes the caller’s own note and hides it from every later read', async () => {
    const id = await seedNote('recruitA');
    const response = await call(deleteNote as never, {
      method: 'DELETE',
      url: `/x/${id}`,
      as: 'recruitA',
      id,
    });

    expect(response.status).toBe(204);
    expect((await prisma.noteEntry.findUniqueOrThrow({ where: { id } })).deletedAt).not.toBeNull();
    expect((await call(getNote as never, { url: `/x/${id}`, as: 'recruitA', id })).status).toBe(404);
  });

  it('refuses a manager deleting a report’s note with a 404', async () => {
    const id = await seedNote('recruitA');
    const response = await call(deleteNote as never, {
      method: 'DELETE',
      url: `/x/${id}`,
      as: 'managerA',
      id,
    });

    expect(response.status).toBe(404);
    expect((await prisma.noteEntry.findUniqueOrThrow({ where: { id } })).deletedAt).toBeNull();
  });
});

describe('filters, sorting and pagination stay inside the scope', () => {
  it('filters by tag case-insensitively without widening the owner set', async () => {
    const tagged = await seedNote('recruitA', { title: 'Tagged note', tags: ['vpn'] });
    await seedNote('recruitA', { title: 'Untagged note' });
    await seedNote('recruitB', { title: 'Another recruit’s tagged note', tags: ['vpn'] });

    const response = await list({ as: 'recruitA', url: '/api/v1/notes?tag=VPN&page_size=100' });
    const items = rowsOf(response.json);

    expect(items.map((row) => row.id)).toContain(tagged);
    expect(items.every((row) => row.tags.includes('vpn'))).toBe(true);
    expect(items.every((row) => row.owner.id === users.recruitA.id)).toBe(true);
  });

  it('rejects a sort field that is not on the allow-list', async () => {
    expect((await list({ as: 'recruitA', url: '/api/v1/notes?sort=owner_id' })).status).toBe(422);
  });

  it('rejects an unknown query parameter rather than ignoring it', async () => {
    expect((await list({ as: 'recruitA', url: '/api/v1/notes?deleted_at=null' })).status).toBe(422);
  });

  it('rejects a reversed date range', async () => {
    const response = await list({
      as: 'recruitA',
      url: '/api/v1/notes?date_from=2026-03-01&date_to=2026-01-01',
    });
    expect(response.status).toBe(422);
  });

  it('counts only rows the caller may see', async () => {
    const response = await list({ as: 'recruitA', url: '/api/v1/notes?page_size=100' });
    const page = response.json.data as { page: { total: number } };
    const actual = await prisma.noteEntry.count({
      where: { ownerId: users.recruitA.id, deletedAt: null },
    });
    expect(page.page.total).toBe(actual);
  });

  it('pages deterministically', async () => {
    const first = await list({ as: 'admin', url: '/api/v1/notes?page=1&page_size=5' });
    const second = await list({ as: 'admin', url: '/api/v1/notes?page=2&page_size=5' });

    const firstIds = rowsOf(first.json).map((row) => row.id);
    const secondIds = rowsOf(second.json).map((row) => row.id);
    expect(firstIds).toHaveLength(5);
    expect(firstIds.some((id) => secondIds.includes(id))).toBe(false);
  });
});
