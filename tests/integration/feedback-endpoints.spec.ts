/**
 * The feedback endpoints against seeded Postgres, through the real handlers.
 * The rule that only exists here is visibility: ADMIN_ONLY feedback is the
 * escape hatch for a concern about your own manager, so it has to be invisible
 * to that manager while staying inside their scope for everything else.
 *
 * Requires a seeded database (`npm run db:reset`); every row this suite writes
 * is removed again in `afterAll`.
 */
import type { UserRole } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  DELETE as deleteFeedback,
  GET as getFeedback,
  PATCH as patchFeedback,
} from '@/app/api/v1/feedback/[id]/route';
import { GET as listFeedbackRoute, POST as createFeedback } from '@/app/api/v1/feedback/route';
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
const createdIds: string[] = [];

type Json = { data?: unknown; error?: { code: string; message: string; details: unknown[] } };

type FeedbackPayload = {
  id: string;
  owner: { id: string };
  subject: string;
  type: string;
  visibility: string;
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
  call(listFeedbackRoute as never, { url: options.url ?? '/api/v1/feedback', as: options.as });

const rowsOf = (json: Json) => (json.data as { items: FeedbackPayload[] }).items;

async function seedFeedback(ownerKey: Key, overrides: Record<string, unknown> = {}): Promise<string> {
  const row = await prisma.feedbackEntry.create({
    data: {
      ownerId: users[ownerKey].id,
      updatedById: users[ownerKey].id,
      entryDate: new Date('2026-01-15'),
      subject: 'Endpoint fixture feedback',
      type: 'SUGGESTION',
      details: 'Something worth saying, in more than ten characters.',
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
  await prisma.feedbackEntry.deleteMany({ where: { id: { in: createdIds } } });
  await prisma.$disconnect();
});

describe('authentication', () => {
  it('refuses an anonymous request rather than falling back to an empty scope', async () => {
    const response = await list();
    expect(response.status).toBe(401);
    expect(response.json.error?.code).toBe('UNAUTHENTICATED');
  });

  it('answers 403 ACCOUNT_DEACTIVATED for a well-formed cookie on a disabled account', async () => {
    const id = users.unassigned.id;
    await prisma.user.update({ where: { id }, data: { isActive: false } });
    try {
      const response = await list({ as: 'unassigned' });
      expect(response.status).toBe(403);
      expect(response.json.error?.code).toBe('ACCOUNT_DEACTIVATED');
    } finally {
      await prisma.user.update({ where: { id }, data: { isActive: true } });
    }
  });
});

describe('GET /feedback — scope and visibility', () => {
  it('returns only the recruit’s own feedback', async () => {
    const response = await list({ as: 'recruitA', url: '/api/v1/feedback?page_size=100' });
    expect(response.status).toBe(200);
    expect(rowsOf(response.json).every((row) => row.owner.id === users.recruitA.id)).toBe(true);
  });

  it('shows a manager their reports’ feedback but nobody else’s', async () => {
    const mine = await seedFeedback('recruitA', { subject: 'Visible to my manager' });
    const theirs = await seedFeedback('recruitB', { subject: 'Another manager’s report' });

    const response = await list({ as: 'managerA', url: '/api/v1/feedback?page_size=100' });
    const ids = rowsOf(response.json).map((row) => row.id);

    expect(ids).toContain(mine);
    expect(ids).not.toContain(theirs);
  });

  it('hides ADMIN_ONLY feedback from the manager it may be about, list and read alike', async () => {
    const id = await seedFeedback('recruitA', {
      subject: 'A concern about my manager',
      type: 'CONCERN',
      visibility: 'ADMIN_ONLY',
    });

    const managerList = await list({ as: 'managerA', url: '/api/v1/feedback?page_size=100' });
    expect(rowsOf(managerList.json).map((row) => row.id)).not.toContain(id);

    const managerRead = await call(getFeedback as never, { url: `/x/${id}`, as: 'managerA', id });
    expect(managerRead.status).toBe(404);
    expect(managerRead.json.error?.message).not.toContain(id);

    // The author and an admin still see it; hiding it from everyone would make
    // the escape hatch useless.
    expect((await call(getFeedback as never, { url: `/x/${id}`, as: 'recruitA', id })).status).toBe(200);
    expect((await call(getFeedback as never, { url: `/x/${id}`, as: 'admin', id })).status).toBe(200);
  });

  it('hides feedback from a manager the moment its author marks it admin-only', async () => {
    const id = await seedFeedback('recruitA', { subject: 'Reclassified mid-flight' });
    expect((await call(getFeedback as never, { url: `/x/${id}`, as: 'managerA', id })).status).toBe(200);

    const patched = await call(patchFeedback as never, {
      method: 'PATCH',
      url: `/x/${id}`,
      as: 'recruitA',
      id,
      body: { visibility: 'ADMIN_ONLY' },
    });
    expect(patched.status).toBe(200);

    expect((await call(getFeedback as never, { url: `/x/${id}`, as: 'managerA', id })).status).toBe(404);
  });

  it('rejects an explicit out-of-scope owner_id with 403 and leaks no id', async () => {
    const response = await list({ as: 'managerA', url: `/api/v1/feedback?owner_id=${users.recruitB.id}` });
    expect(response.status).toBe(403);
    expect(response.json.error?.code).toBe('OUT_OF_SCOPE');
    expect(response.json.error?.message).not.toContain(users.recruitB.id);
  });

  it('follows a live reassignment rather than a cached scope', async () => {
    expect(
      (await list({ as: 'managerB', url: `/api/v1/feedback?owner_id=${users.recruitA.id}` })).status
    ).toBe(403);

    await prisma.user.update({ where: { id: users.recruitA.id }, data: { managerId: users.managerB.id } });
    try {
      const after = await list({ as: 'managerB', url: `/api/v1/feedback?owner_id=${users.recruitA.id}` });
      expect(after.status).toBe(200);
    } finally {
      await prisma.user.update({ where: { id: users.recruitA.id }, data: { managerId: users.managerA.id } });
    }
  });

  it('reads across every owner for an admin and still excludes soft-deleted rows', async () => {
    const deleted = await seedFeedback('recruitB', { subject: 'Soft deleted', deletedAt: new Date() });
    const response = await list({ as: 'admin', url: '/api/v1/feedback?page_size=100' });

    expect(new Set(rowsOf(response.json).map((row) => row.owner.id)).size).toBeGreaterThan(2);
    expect(rowsOf(response.json).some((row) => row.id === deleted)).toBe(false);
    expect(
      (await call(getFeedback as never, { url: `/x/${deleted}`, as: 'admin', id: deleted })).status
    ).toBe(404);
  });

  it('never exposes an owner’s email address', async () => {
    const response = await list({ as: 'managerA' });
    expect(JSON.stringify(response.json)).not.toContain('@onboarding.test');
  });

  it('answers 404 identically for a missing id and a malformed one', async () => {
    const missing = '00000000-0000-4000-8000-000000000000';
    const absent = await call(getFeedback as never, { url: `/x/${missing}`, as: 'admin', id: missing });
    const malformed = await call(getFeedback as never, { url: '/x/nope', as: 'admin', id: 'not-a-uuid' });

    expect(absent.status).toBe(404);
    expect(malformed.status).toBe(404);
    expect(malformed.json.error?.code).toBe(absent.json.error?.code);
  });
});

describe('POST /feedback', () => {
  it('creates feedback for the caller and defaults it to manager-visible', async () => {
    const response = await call(createFeedback as never, {
      method: 'POST',
      url: '/api/v1/feedback',
      as: 'recruitA',
      body: {
        entry_date: '2026-01-20',
        subject: 'The buddy system worked well',
        type: 'POSITIVE',
        details: 'Having a named buddy in week one removed most of the guesswork.',
      },
    });

    expect(response.status).toBe(201);
    const created = response.json.data as FeedbackPayload;
    createdIds.push(created.id);
    expect(created.owner.id).toBe(users.recruitA.id);
    expect(created.visibility).toBe('MANAGER_VISIBLE');
  });

  it('refuses a manager writing feedback for their own report', async () => {
    const response = await call(createFeedback as never, {
      method: 'POST',
      url: '/api/v1/feedback',
      as: 'managerA',
      body: {
        entry_date: '2026-01-20',
        subject: 'Written by the manager',
        type: 'SUGGESTION',
        details: 'Feedback authored on behalf of a recruit, which is not allowed.',
        owner_id: users.recruitA.id,
      },
    });

    expect(response.status).toBe(403);
    expect(response.json.error?.code).toBe('INSUFFICIENT_ROLE');
  });

  it('audits an admin writing into somebody else’s diary, in the same transaction', async () => {
    const response = await call(createFeedback as never, {
      method: 'POST',
      url: '/api/v1/feedback',
      as: 'admin',
      body: {
        entry_date: '2026-01-21',
        subject: 'Recorded during the onboarding review',
        type: 'SUGGESTION',
        details: 'Captured on the recruit’s behalf during the review meeting.',
        owner_id: users.recruitB.id,
      },
    });

    expect(response.status).toBe(201);
    const created = response.json.data as FeedbackPayload;
    createdIds.push(created.id);

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'ENTRY.CROSS_USER_UPDATED', entityId: created.id },
    });
    expect(audit?.actorUserId).toBe(users.admin.id);
    expect(audit?.targetUserId).toBe(users.recruitB.id);
    expect(audit?.entityType).toBe('FEEDBACK');
  });

  it('rejects an unknown field rather than ignoring it', async () => {
    const response = await call(createFeedback as never, {
      method: 'POST',
      url: '/api/v1/feedback',
      as: 'recruitA',
      body: {
        entry_date: '2026-01-20',
        subject: 'Mass assignment attempt',
        type: 'POSITIVE',
        details: 'Trying to set fields the server owns.',
        version: 99,
      },
    });

    expect(response.status).toBe(422);
  });

  it('rejects a form-encoded body, so the cookie cannot be driven cross-site', async () => {
    const response = await call(createFeedback as never, {
      method: 'POST',
      url: '/api/v1/feedback',
      as: 'recruitA',
      contentType: 'application/x-www-form-urlencoded',
      body: {
        entry_date: '2026-01-20',
        subject: 'CSRF attempt',
        type: 'POSITIVE',
        details: 'Long enough to pass validation.',
      },
    });
    expect(response.status).toBe(415);
  });

  it('rejects an impossible date, a bad enum and details that say nothing', async () => {
    const bodies = [
      {
        entry_date: '2026-02-31',
        subject: 'Impossible date',
        type: 'POSITIVE',
        details: 'Long enough to pass validation.',
      },
      {
        entry_date: '2026-01-20',
        subject: 'Bad type',
        type: 'GRUMBLE',
        details: 'Long enough to pass validation.',
      },
      { entry_date: '2026-01-20', subject: 'Terse', type: 'POSITIVE', details: 'too short' },
    ];

    for (const body of bodies) {
      const response = await call(createFeedback as never, {
        method: 'POST',
        url: '/api/v1/feedback',
        as: 'recruitA',
        body,
      });
      expect(response.status).toBe(422);
    }
  });
});

describe('PATCH /feedback/{id}', () => {
  it('updates the caller’s own feedback', async () => {
    const id = await seedFeedback('recruitA');
    const response = await call(patchFeedback as never, {
      method: 'PATCH',
      url: `/x/${id}`,
      as: 'recruitA',
      id,
      body: { subject: 'Revised after the retro', type: 'SUGGESTION' },
    });

    expect(response.status).toBe(200);
    const row = response.json.data as FeedbackPayload;
    expect(row.subject).toBe('Revised after the retro');
    expect(row.version).toBe(2);
  });

  it('refuses a manager editing a report’s feedback — there is no triage here', async () => {
    const id = await seedFeedback('recruitA', { subject: 'Untouched by the manager' });
    const response = await call(patchFeedback as never, {
      method: 'PATCH',
      url: `/x/${id}`,
      as: 'managerA',
      id,
      body: { subject: 'Rewritten by the manager' },
    });

    expect(response.status).toBe(403);
    expect(response.json.error?.code).toBe('FIELD_NOT_PERMITTED');
    const after = await prisma.feedbackEntry.findUniqueOrThrow({ where: { id } });
    expect(after.subject).toBe('Untouched by the manager');
  });

  it('refuses a manager touching another manager’s recruit with a 404', async () => {
    const id = await seedFeedback('recruitB');
    const response = await call(patchFeedback as never, {
      method: 'PATCH',
      url: `/x/${id}`,
      as: 'managerA',
      id,
      body: { subject: 'Out of scope entirely' },
    });
    expect(response.status).toBe(404);
  });

  it('rejects an attempt to reassign ownership', async () => {
    const id = await seedFeedback('recruitA');
    const response = await call(patchFeedback as never, {
      method: 'PATCH',
      url: `/x/${id}`,
      as: 'recruitA',
      id,
      body: { owner_id: users.recruitA2.id },
    });

    expect(response.status).toBe(422);
    const after = await prisma.feedbackEntry.findUniqueOrThrow({ where: { id } });
    expect(after.ownerId).toBe(users.recruitA.id);
  });

  it('refuses a stale expected_version with 409 and leaves the row alone', async () => {
    const id = await seedFeedback('recruitA', { subject: 'Concurrently edited' });
    await prisma.feedbackEntry.update({ where: { id }, data: { version: { increment: 1 } } });

    const response = await call(patchFeedback as never, {
      method: 'PATCH',
      url: `/x/${id}`,
      as: 'recruitA',
      id,
      body: { subject: 'Written over a stale read', expected_version: 1 },
    });

    expect(response.status).toBe(409);
    expect(response.json.error?.code).toBe('VERSION_CONFLICT');
    const after = await prisma.feedbackEntry.findUniqueOrThrow({ where: { id } });
    expect(after.subject).toBe('Concurrently edited');
  });

  it('answers 404 for an invisible id before it considers the version', async () => {
    const id = await seedFeedback('recruitA', { visibility: 'ADMIN_ONLY' });
    const response = await call(patchFeedback as never, {
      method: 'PATCH',
      url: `/x/${id}`,
      as: 'managerA',
      id,
      body: { subject: 'Probing for an admin-only entry', expected_version: 99 },
    });
    expect(response.status).toBe(404);
  });
});

describe('DELETE /feedback/{id}', () => {
  it('soft-deletes the caller’s own feedback and hides it from every later read', async () => {
    const id = await seedFeedback('recruitA');
    const response = await call(deleteFeedback as never, {
      method: 'DELETE',
      url: `/x/${id}`,
      as: 'recruitA',
      id,
    });

    expect(response.status).toBe(204);
    expect((await prisma.feedbackEntry.findUniqueOrThrow({ where: { id } })).deletedAt).not.toBeNull();
    expect((await call(getFeedback as never, { url: `/x/${id}`, as: 'recruitA', id })).status).toBe(404);
  });

  it('refuses a manager deleting a report’s feedback', async () => {
    const id = await seedFeedback('recruitA');
    const response = await call(deleteFeedback as never, {
      method: 'DELETE',
      url: `/x/${id}`,
      as: 'managerA',
      id,
    });

    expect(response.status).toBe(403);
    expect((await prisma.feedbackEntry.findUniqueOrThrow({ where: { id } })).deletedAt).toBeNull();
  });
});

describe('filters, sorting and pagination stay inside the scope', () => {
  it('applies type and visibility filters without widening the owner set', async () => {
    await seedFeedback('recruitA', { type: 'CONCERN', visibility: 'ADMIN_ONLY' });
    const response = await list({
      as: 'managerA',
      url: '/api/v1/feedback?type=POSITIVE,SUGGESTION&visibility=MANAGER_VISIBLE&page_size=100',
    });

    const items = rowsOf(response.json);
    expect(items.every((row) => ['POSITIVE', 'SUGGESTION'].includes(row.type))).toBe(true);
    expect(items.every((row) => row.visibility === 'MANAGER_VISIBLE')).toBe(true);
    expect(items.some((row) => row.owner.id === users.recruitB.id)).toBe(false);
  });

  it('cannot be widened to admin-only feedback by asking for it', async () => {
    const id = await seedFeedback('recruitA', { visibility: 'ADMIN_ONLY' });
    const response = await list({
      as: 'managerA',
      url: '/api/v1/feedback?visibility=ADMIN_ONLY&page_size=100',
    });

    expect(response.status).toBe(200);
    expect(rowsOf(response.json).map((row) => row.id)).not.toContain(id);
  });

  it('rejects an invalid member of a CSV enum filter rather than dropping it', async () => {
    const response = await list({ as: 'recruitA', url: '/api/v1/feedback?type=POSITIVE,NONSENSE' });
    expect(response.status).toBe(422);
  });

  it('rejects a sort field that is not on the allow-list', async () => {
    expect((await list({ as: 'recruitA', url: '/api/v1/feedback?sort=owner_id' })).status).toBe(422);
  });

  it('rejects an unknown query parameter rather than ignoring it', async () => {
    expect((await list({ as: 'recruitA', url: '/api/v1/feedback?deleted_at=null' })).status).toBe(422);
  });

  it('rejects a reversed date range', async () => {
    const response = await list({
      as: 'recruitA',
      url: '/api/v1/feedback?date_from=2026-03-01&date_to=2026-01-01',
    });
    expect(response.status).toBe(422);
  });

  it('counts only rows the caller may see', async () => {
    const response = await list({ as: 'recruitA', url: '/api/v1/feedback?page_size=100' });
    const page = response.json.data as { page: { total: number } };
    const actual = await prisma.feedbackEntry.count({
      where: { ownerId: users.recruitA.id, deletedAt: null },
    });
    expect(page.page.total).toBe(actual);
  });
});
