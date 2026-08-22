/**
 * The authorization matrix, re-proved one layer up.
 *
 * `authz-matrix.spec.ts` proves the guards; this file proves the HTTP surface
 * actually reaches them. Every case goes through the real route handler with a
 * real signed session cookie against seeded Postgres — no mocked repository, no
 * injected actor — so a handler that forgot to call `requireCurrentUser`, built
 * its own `where`, or trusted the middleware would fail here rather than in
 * review. Middleware never runs in these tests, which is the point: the
 * endpoints must be safe on their own (S3).
 */
import type { UserRole } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DELETE as deleteTask, GET as getTask, PATCH as patchTask } from '@/app/api/v1/tasks/[id]/route';
import { GET as listTasks, POST as createTask } from '@/app/api/v1/tasks/route';
import { SESSION_COOKIE, signSession } from '@/src/modules/auth/session';
import { prisma } from '@/src/shared/db/prisma';

const EMAILS = {
  admin: 'admin@onboarding.test',
  managerA: 'marcus.bell@onboarding.test',
  managerB: 'dana.lee@onboarding.test',
  recruitA: 'priya.sharma@onboarding.test',
  recruitA2: 'sam.okafor@onboarding.test',
  recruitB: 'aisha.khan@onboarding.test',
  unassigned: 'noah.silva@onboarding.test',
} as const;

type Key = keyof typeof EMAILS;

const users = {} as Record<Key, { id: string; role: UserRole; cookie: string }>;
const createdTaskIds: string[] = [];

type Json = { data?: unknown; error?: { code: string; message: string; details: unknown[] } };

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
  call(listTasks as never, { url: options.url ?? '/api/v1/tasks', as: options.as });

const rowsOf = (json: Json) => (json.data as { items: { id: string; owner: { id: string } }[] }).items;

async function seedTask(ownerKey: Key, overrides: Record<string, unknown> = {}): Promise<string> {
  const task = await prisma.taskEntry.create({
    data: {
      ownerId: users[ownerKey].id,
      updatedById: users[ownerKey].id,
      entryDate: new Date('2026-01-15'),
      title: 'Endpoint fixture task',
      ...overrides,
    },
    select: { id: true },
  });
  createdTaskIds.push(task.id);
  return task.id;
}

beforeAll(async () => {
  const rows = await prisma.user.findMany({
    where: { email: { in: Object.values(EMAILS) } },
    select: { id: true, email: true, role: true },
  });

  for (const [key, email] of Object.entries(EMAILS) as [Key, string][]) {
    const row = rows.find((candidate) => candidate.email === email);
    if (!row) throw new Error(`Seed fixture missing: ${email}. Run npm run db:seed.`);
    users[key] = {
      id: row.id,
      role: row.role,
      cookie: `${SESSION_COOKIE}=${await signSession(row.id)}`,
    };
  }
});

afterAll(async () => {
  await prisma.taskEntry.deleteMany({ where: { id: { in: createdTaskIds } } });
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
      const response = await list({ as: 'unassigned' });
      expect(response.status).toBe(401);
    } finally {
      await prisma.user.update({ where: { id }, data: { isActive: true } });
    }
  });
});

describe('AZ-R1 — GET /tasks as a recruit', () => {
  it('returns only their own tasks', async () => {
    const response = await list({ as: 'recruitA' });
    expect(response.status).toBe(200);
    const items = rowsOf(response.json);
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((task) => task.owner.id === users.recruitA.id)).toBe(true);
  });

  it('rejects an explicit owner_id for a peer with 403 OUT_OF_SCOPE', async () => {
    const response = await list({ as: 'recruitA', url: `/api/v1/tasks?owner_id=${users.recruitA2.id}` });
    expect(response.status).toBe(403);
    expect(response.json.error?.code).toBe('OUT_OF_SCOPE');
    expect(response.json.error?.message).not.toContain(users.recruitA2.id);
  });
});

describe('AZ-M1 / AZ-M2 — GET /tasks as a manager', () => {
  it('returns the manager and their direct reports and nobody else', async () => {
    const response = await list({ as: 'managerA' });
    const owners = new Set(rowsOf(response.json).map((task) => task.owner.id));

    expect(owners.size).toBeGreaterThan(1);
    expect(owners.has(users.recruitA.id)).toBe(true);
    expect(owners.has(users.recruitB.id)).toBe(false);
    expect(owners.has(users.unassigned.id)).toBe(false);
    expect(owners.has(users.managerB.id)).toBe(false);
  });

  it('rejects another manager’s recruit as an explicit owner_id', async () => {
    const response = await list({ as: 'managerA', url: `/api/v1/tasks?owner_id=${users.recruitB.id}` });
    expect(response.status).toBe(403);
    expect(response.json.error?.code).toBe('OUT_OF_SCOPE');
  });

  it('narrows to one in-scope report when asked', async () => {
    const response = await list({ as: 'managerA', url: `/api/v1/tasks?owner_id=${users.recruitA.id}` });
    expect(response.status).toBe(200);
    expect(rowsOf(response.json).every((task) => task.owner.id === users.recruitA.id)).toBe(true);
  });

  it('follows a live reassignment rather than a cached scope', async () => {
    const before = await list({ as: 'managerB', url: `/api/v1/tasks?owner_id=${users.recruitA.id}` });
    expect(before.status).toBe(403);

    await prisma.user.update({ where: { id: users.recruitA.id }, data: { managerId: users.managerB.id } });
    try {
      const after = await list({ as: 'managerB', url: `/api/v1/tasks?owner_id=${users.recruitA.id}` });
      expect(after.status).toBe(200);
      const denied = await list({ as: 'managerA', url: `/api/v1/tasks?owner_id=${users.recruitA.id}` });
      expect(denied.status).toBe(403);
    } finally {
      await prisma.user.update({ where: { id: users.recruitA.id }, data: { managerId: users.managerA.id } });
    }
  });
});

describe('admin scope { kind: ALL }', () => {
  it('reads across every owner, including the recruit with no manager', async () => {
    const response = await list({ as: 'admin', url: '/api/v1/tasks?page_size=100' });
    expect(response.status).toBe(200);
    const owners = new Set(rowsOf(response.json).map((task) => task.owner.id));
    expect(owners.size).toBeGreaterThan(2);
  });

  it('produces a query with no owner predicate at all rather than an id list', async () => {
    const { scopedEntryWhere } = await import('@/src/modules/entries/base-repository');
    const where = await scopedEntryWhere({ id: users.admin.id, role: 'ADMIN' }, 'TASK');

    // The distinction that matters: ALL must mean "omit the predicate", not
    // "an empty list" (which would silently return nothing) and not "every id"
    // (which would be an unbounded IN clause that goes stale mid-request).
    expect(where.ownerId).toBeUndefined();
    expect(where.deletedAt).toBeNull();
  });

  it('still excludes soft-deleted rows', async () => {
    const id = await seedTask('recruitB', { title: 'Soft deleted', deletedAt: new Date() });
    const response = await call(getTask as never, { url: `/api/v1/tasks/${id}`, as: 'admin', id });
    expect(response.status).toBe(404);
  });
});

describe('AZ-M3 / AZ-R2 — GET /tasks/{id}', () => {
  it('answers 404, not 403, for a task the caller cannot see', async () => {
    const id = await seedTask('recruitB');

    for (const as of ['managerA', 'recruitA'] as const) {
      const response = await call(getTask as never, { url: `/api/v1/tasks/${id}`, as, id });
      expect(response.status).toBe(404);
      expect(response.json.error?.code).toBe('NOT_FOUND');
      expect(response.json.error?.message).not.toContain(id);
    }
  });

  it('answers 404 identically for an id that does not exist and for a malformed id', async () => {
    const missing = '00000000-0000-4000-8000-000000000000';
    const absent = await call(getTask as never, {
      url: `/api/v1/tasks/${missing}`,
      as: 'admin',
      id: missing,
    });
    const malformed = await call(getTask as never, {
      url: '/api/v1/tasks/not-a-uuid',
      as: 'admin',
      id: 'not-a-uuid',
    });

    expect(absent.status).toBe(404);
    expect(malformed.status).toBe(404);
    expect(malformed.json.error?.code).toBe(absent.json.error?.code);
  });
});

describe('POST /tasks', () => {
  it('creates a task for the caller and ignores nothing silently', async () => {
    const response = await call(createTask as never, {
      method: 'POST',
      url: '/api/v1/tasks',
      as: 'recruitA',
      body: { entry_date: '2026-01-20', title: 'Wrote the onboarding checklist', status: 'DONE' },
    });

    expect(response.status).toBe(201);
    const created = response.json.data as { id: string; owner: { id: string }; completed_at: string | null };
    createdTaskIds.push(created.id);
    expect(created.owner.id).toBe(users.recruitA.id);
    // C1: DONE implies a completion timestamp, stamped rather than demanded.
    expect(created.completed_at).not.toBeNull();
  });

  it('AZ-M10 — refuses a manager writing an entry for their own report', async () => {
    const response = await call(createTask as never, {
      method: 'POST',
      url: '/api/v1/tasks',
      as: 'managerA',
      body: { entry_date: '2026-01-20', title: 'Task written by the manager', owner_id: users.recruitA.id },
    });

    expect(response.status).toBe(403);
    expect(response.json.error?.code).toBe('INSUFFICIENT_ROLE');
  });

  it('refuses a recruit writing an entry for a peer', async () => {
    const response = await call(createTask as never, {
      method: 'POST',
      url: '/api/v1/tasks',
      as: 'recruitA',
      body: { entry_date: '2026-01-20', title: 'Task written for a peer', owner_id: users.recruitA2.id },
    });
    expect(response.status).toBe(403);
  });

  it('audits an admin writing into somebody else’s diary', async () => {
    const response = await call(createTask as never, {
      method: 'POST',
      url: '/api/v1/tasks',
      as: 'admin',
      body: { entry_date: '2026-01-21', title: 'Admin-authored entry', owner_id: users.recruitB.id },
    });

    expect(response.status).toBe(201);
    const created = response.json.data as { id: string };
    createdTaskIds.push(created.id);

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'ENTRY.CROSS_USER_UPDATED', entityId: created.id },
    });
    expect(audit?.actorUserId).toBe(users.admin.id);
    expect(audit?.targetUserId).toBe(users.recruitB.id);
  });

  it('rejects an unknown field instead of ignoring it', async () => {
    const response = await call(createTask as never, {
      method: 'POST',
      url: '/api/v1/tasks',
      as: 'recruitA',
      body: { entry_date: '2026-01-20', title: 'Mass assignment attempt', version: 99, id: 'x' },
    });
    expect(response.status).toBe(422);
    expect(response.json.error?.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a form-encoded body, so the cookie cannot be driven cross-site', async () => {
    const response = await call(createTask as never, {
      method: 'POST',
      url: '/api/v1/tasks',
      as: 'recruitA',
      contentType: 'application/x-www-form-urlencoded',
      body: { entry_date: '2026-01-20', title: 'CSRF attempt' },
    });
    expect(response.status).toBe(415);
  });

  it('rejects a date that does not exist', async () => {
    const response = await call(createTask as never, {
      method: 'POST',
      url: '/api/v1/tasks',
      as: 'recruitA',
      body: { entry_date: '2026-02-31', title: 'Impossible date' },
    });
    expect(response.status).toBe(422);
  });
});

describe('PATCH /tasks/{id}', () => {
  it('updates the caller’s own task', async () => {
    const id = await seedTask('recruitA');
    const response = await call(patchTask as never, {
      method: 'PATCH',
      url: `/api/v1/tasks/${id}`,
      as: 'recruitA',
      id,
      body: { status: 'DONE' },
    });

    expect(response.status).toBe(200);
    const task = response.json.data as { status: string; completed_at: string | null; version: number };
    expect(task.status).toBe('DONE');
    expect(task.completed_at).not.toBeNull();
    expect(task.version).toBe(2);
  });

  it('AZ-M10 — refuses a manager editing an in-scope recruit’s task, and writes nothing', async () => {
    const id = await seedTask('recruitA', { title: 'Untouched by the manager' });
    const response = await call(patchTask as never, {
      method: 'PATCH',
      url: `/api/v1/tasks/${id}`,
      as: 'managerA',
      id,
      body: { title: 'Rewritten by the manager' },
    });

    expect(response.status).toBe(403);
    expect(response.json.error?.code).toBe('FIELD_NOT_PERMITTED');
    const after = await prisma.taskEntry.findUniqueOrThrow({ where: { id } });
    expect(after.title).toBe('Untouched by the manager');
  });

  it('answers 404 for an out-of-scope task rather than confirming it exists', async () => {
    const id = await seedTask('recruitB');
    const response = await call(patchTask as never, {
      method: 'PATCH',
      url: `/api/v1/tasks/${id}`,
      as: 'managerA',
      id,
      body: { status: 'DONE' },
    });
    expect(response.status).toBe(404);
  });

  it('rejects an attempt to reassign ownership', async () => {
    const id = await seedTask('recruitA');
    const response = await call(patchTask as never, {
      method: 'PATCH',
      url: `/api/v1/tasks/${id}`,
      as: 'recruitA',
      id,
      body: { owner_id: users.recruitA2.id },
    });

    expect(response.status).toBe(422);
    const after = await prisma.taskEntry.findUniqueOrThrow({ where: { id } });
    expect(after.ownerId).toBe(users.recruitA.id);
  });

  it('records AUTHZ.DENIED when a request is refused', async () => {
    const before = await prisma.auditLog.count({ where: { action: 'AUTHZ.DENIED' } });
    await list({ as: 'managerA', url: `/api/v1/tasks?owner_id=${users.recruitB.id}` });

    // The denial audit is written outside the request's critical path, so give
    // the promise a turn to settle before counting.
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(await prisma.auditLog.count({ where: { action: 'AUTHZ.DENIED' } })).toBeGreaterThan(before);
  });
});

describe('DELETE /tasks/{id}', () => {
  it('soft-deletes the caller’s own task and hides it from every later read', async () => {
    const id = await seedTask('recruitA');
    const response = await call(deleteTask as never, {
      method: 'DELETE',
      url: `/api/v1/tasks/${id}`,
      as: 'recruitA',
      id,
    });

    expect(response.status).toBe(204);
    const row = await prisma.taskEntry.findUniqueOrThrow({ where: { id } });
    expect(row.deletedAt).not.toBeNull();

    const fetched = await call(getTask as never, { url: `/api/v1/tasks/${id}`, as: 'recruitA', id });
    expect(fetched.status).toBe(404);
  });

  it('refuses a manager deleting a report’s task', async () => {
    const id = await seedTask('recruitA');
    const response = await call(deleteTask as never, {
      method: 'DELETE',
      url: `/api/v1/tasks/${id}`,
      as: 'managerA',
      id,
    });

    expect(response.status).toBe(403);
    const row = await prisma.taskEntry.findUniqueOrThrow({ where: { id } });
    expect(row.deletedAt).toBeNull();
  });
});

describe('filters, sorting and pagination stay inside the scope', () => {
  it('applies a status filter without widening the owner set', async () => {
    const response = await list({ as: 'managerA', url: '/api/v1/tasks?status=DONE&page_size=100' });
    const items = response.json.data as { items: { status: string; owner: { id: string } }[] };

    expect(items.items.every((task) => task.status === 'DONE')).toBe(true);
    expect(items.items.some((task) => task.owner.id === users.recruitB.id)).toBe(false);
  });

  it('rejects a sort field that is not on the allow-list', async () => {
    const response = await list({ as: 'recruitA', url: '/api/v1/tasks?sort=owner_id' });
    expect(response.status).toBe(422);
  });

  it('rejects an unknown query parameter rather than ignoring it', async () => {
    const response = await list({ as: 'recruitA', url: '/api/v1/tasks?deleted_at=null' });
    expect(response.status).toBe(422);
  });

  it('counts only rows the caller may see', async () => {
    const recruit = await list({ as: 'recruitA', url: '/api/v1/tasks?page_size=100' });
    const page = recruit.json.data as { items: unknown[]; page: { total: number } };
    const actual = await prisma.taskEntry.count({
      where: { ownerId: users.recruitA.id, deletedAt: null },
    });
    expect(page.page.total).toBe(actual);
  });

  it('pages deterministically', async () => {
    const first = await list({ as: 'admin', url: '/api/v1/tasks?page=1&page_size=5' });
    const second = await list({ as: 'admin', url: '/api/v1/tasks?page=2&page_size=5' });

    const firstIds = rowsOf(first.json).map((task) => task.id);
    const secondIds = rowsOf(second.json).map((task) => task.id);
    expect(firstIds).toHaveLength(5);
    expect(firstIds.some((id) => secondIds.includes(id))).toBe(false);
  });
});
