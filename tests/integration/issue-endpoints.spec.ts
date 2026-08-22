/**
 * The issue endpoints against seeded Postgres, through the real handlers with
 * real signed cookies and no middleware — same contract as the task suite, plus
 * the two rules that are specific to issues: a manager may triage a report's
 * issue but may not rewrite it, and the resolution fields are derived by the
 * server rather than accepted from the client.
 */
import type { UserRole } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DELETE as deleteIssue, GET as getIssue, PATCH as patchIssue } from '@/app/api/v1/issues/[id]/route';
import { GET as listIssuesRoute, POST as createIssue } from '@/app/api/v1/issues/route';
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
const createdIssueIds: string[] = [];

type Json = { data?: unknown; error?: { code: string; message: string; details: unknown[] } };

type IssuePayload = {
  id: string;
  owner: { id: string };
  status: string;
  severity: string;
  title: string;
  resolution_notes: string | null;
  resolved_at: string | null;
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
  call(listIssuesRoute as never, { url: options.url ?? '/api/v1/issues', as: options.as });

const rowsOf = (json: Json) => (json.data as { items: IssuePayload[] }).items;

async function seedIssue(ownerKey: Key, overrides: Record<string, unknown> = {}): Promise<string> {
  const issue = await prisma.issueEntry.create({
    data: {
      ownerId: users[ownerKey].id,
      updatedById: users[ownerKey].id,
      entryDate: new Date('2026-01-15'),
      title: 'Endpoint fixture issue',
      description: 'A blocker described in more than ten characters.',
      ...overrides,
    },
    select: { id: true },
  });
  createdIssueIds.push(issue.id);
  return issue.id;
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
  await prisma.issueEntry.deleteMany({ where: { id: { in: createdIssueIds } } });
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

describe('GET /issues — scope', () => {
  it('returns only the recruit’s own issues', async () => {
    const response = await list({ as: 'recruitA', url: '/api/v1/issues?page_size=100' });
    expect(response.status).toBe(200);
    expect(rowsOf(response.json).every((issue) => issue.owner.id === users.recruitA.id)).toBe(true);
  });

  it('returns a manager’s direct reports and nobody else’s', async () => {
    const response = await list({ as: 'managerA', url: '/api/v1/issues?page_size=100' });
    const owners = new Set(rowsOf(response.json).map((issue) => issue.owner.id));

    expect(owners.has(users.recruitA.id)).toBe(true);
    expect(owners.has(users.recruitB.id)).toBe(false);
    expect(owners.has(users.unassigned.id)).toBe(false);
  });

  it('rejects an explicit out-of-scope owner_id with 403 and leaks no id', async () => {
    const response = await list({ as: 'managerA', url: `/api/v1/issues?owner_id=${users.recruitB.id}` });
    expect(response.status).toBe(403);
    expect(response.json.error?.code).toBe('OUT_OF_SCOPE');
    expect(response.json.error?.message).not.toContain(users.recruitB.id);
  });

  it('follows a live reassignment rather than a cached scope', async () => {
    expect((await list({ as: 'managerB', url: `/api/v1/issues?owner_id=${users.recruitA.id}` })).status).toBe(
      403
    );

    await prisma.user.update({ where: { id: users.recruitA.id }, data: { managerId: users.managerB.id } });
    try {
      const after = await list({ as: 'managerB', url: `/api/v1/issues?owner_id=${users.recruitA.id}` });
      expect(after.status).toBe(200);
    } finally {
      await prisma.user.update({ where: { id: users.recruitA.id }, data: { managerId: users.managerA.id } });
    }
  });

  it('reads across every owner for an admin and still excludes soft-deleted rows', async () => {
    const deleted = await seedIssue('recruitB', { title: 'Soft deleted', deletedAt: new Date() });
    const response = await list({ as: 'admin', url: '/api/v1/issues?page_size=100' });

    expect(new Set(rowsOf(response.json).map((issue) => issue.owner.id)).size).toBeGreaterThan(2);
    expect(rowsOf(response.json).some((issue) => issue.id === deleted)).toBe(false);
    expect((await call(getIssue as never, { url: `/x/${deleted}`, as: 'admin', id: deleted })).status).toBe(
      404
    );
  });

  it('never exposes an owner’s email address', async () => {
    const response = await list({ as: 'managerA' });
    expect(JSON.stringify(response.json)).not.toContain('@onboarding.test');
  });
});

describe('GET /issues/{id}', () => {
  it('answers 404, not 403, for an issue the caller cannot see', async () => {
    const id = await seedIssue('recruitB');

    for (const as of ['managerA', 'recruitA'] as const) {
      const response = await call(getIssue as never, { url: `/api/v1/issues/${id}`, as, id });
      expect(response.status).toBe(404);
      expect(response.json.error?.message).not.toContain(id);
    }
  });

  it('answers 404 identically for a missing id and a malformed one', async () => {
    const missing = '00000000-0000-4000-8000-000000000000';
    const absent = await call(getIssue as never, { url: `/x/${missing}`, as: 'admin', id: missing });
    const malformed = await call(getIssue as never, { url: '/x/nope', as: 'admin', id: 'not-a-uuid' });

    expect(absent.status).toBe(404);
    expect(malformed.status).toBe(404);
    expect(malformed.json.error?.code).toBe(absent.json.error?.code);
  });
});

describe('POST /issues', () => {
  it('creates an issue for the caller', async () => {
    const response = await call(createIssue as never, {
      method: 'POST',
      url: '/api/v1/issues',
      as: 'recruitA',
      body: {
        entry_date: '2026-01-20',
        title: 'VPN access still pending',
        description: 'I cannot reach the staging environment without VPN access.',
        severity: 'HIGH',
      },
    });

    expect(response.status).toBe(201);
    const created = response.json.data as IssuePayload;
    createdIssueIds.push(created.id);
    expect(created.owner.id).toBe(users.recruitA.id);
    expect(created.status).toBe('OPEN');
    expect(created.resolved_at).toBeNull();
  });

  it('stamps resolved_at itself when an issue is created already resolved', async () => {
    const response = await call(createIssue as never, {
      method: 'POST',
      url: '/api/v1/issues',
      as: 'recruitA',
      body: {
        entry_date: '2026-01-20',
        title: 'Laptop was too slow to build',
        description: 'The build took forty minutes on the loaner machine.',
        status: 'RESOLVED',
        resolution_notes: 'Swapped for a machine with more memory.',
      },
    });

    expect(response.status).toBe(201);
    const created = response.json.data as IssuePayload;
    createdIssueIds.push(created.id);
    expect(created.resolved_at).not.toBeNull();
  });

  it('refuses to close an issue without resolution notes rather than letting the CHECK fail', async () => {
    const response = await call(createIssue as never, {
      method: 'POST',
      url: '/api/v1/issues',
      as: 'recruitA',
      body: {
        entry_date: '2026-01-20',
        title: 'Closed with nothing to show for it',
        description: 'Ten characters of description at least.',
        status: 'CLOSED',
      },
    });

    expect(response.status).toBe(422);
    expect(response.json.error?.code).toBe('VALIDATION_ERROR');
  });

  it('refuses a manager writing an issue for their own report', async () => {
    const response = await call(createIssue as never, {
      method: 'POST',
      url: '/api/v1/issues',
      as: 'managerA',
      body: {
        entry_date: '2026-01-20',
        title: 'Issue written by the manager',
        description: 'Written on behalf of a recruit, which is not allowed.',
        owner_id: users.recruitA.id,
      },
    });

    expect(response.status).toBe(403);
    expect(response.json.error?.code).toBe('INSUFFICIENT_ROLE');
  });

  it('audits an admin writing into somebody else’s diary, in the same transaction', async () => {
    const response = await call(createIssue as never, {
      method: 'POST',
      url: '/api/v1/issues',
      as: 'admin',
      body: {
        entry_date: '2026-01-21',
        title: 'Admin-authored issue',
        description: 'Raised on behalf of the recruit during onboarding review.',
        owner_id: users.recruitB.id,
      },
    });

    expect(response.status).toBe(201);
    const created = response.json.data as IssuePayload;
    createdIssueIds.push(created.id);

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'ENTRY.CROSS_USER_UPDATED', entityId: created.id },
    });
    expect(audit?.actorUserId).toBe(users.admin.id);
    expect(audit?.targetUserId).toBe(users.recruitB.id);
  });

  it('rejects mass assignment of server-derived fields', async () => {
    const response = await call(createIssue as never, {
      method: 'POST',
      url: '/api/v1/issues',
      as: 'recruitA',
      body: {
        entry_date: '2026-01-20',
        title: 'Mass assignment attempt',
        description: 'Trying to set the resolution timestamp directly.',
        resolved_at: '2020-01-01T00:00:00.000Z',
        version: 99,
      },
    });

    expect(response.status).toBe(422);
  });

  it('rejects a form-encoded body, so the cookie cannot be driven cross-site', async () => {
    const response = await call(createIssue as never, {
      method: 'POST',
      url: '/api/v1/issues',
      as: 'recruitA',
      contentType: 'application/x-www-form-urlencoded',
      body: { entry_date: '2026-01-20', title: 'CSRF attempt', description: 'Long enough to pass.' },
    });
    expect(response.status).toBe(415);
  });

  it('rejects an impossible date, a bad enum and a too-short description', async () => {
    const bodies = [
      { entry_date: '2026-02-31', title: 'Impossible date', description: 'Long enough to pass.' },
      {
        entry_date: '2026-01-20',
        title: 'Bad severity',
        description: 'Long enough to pass.',
        severity: 'CATASTROPHIC',
      },
      { entry_date: '2026-01-20', title: 'Terse', description: 'too short' },
    ];

    for (const body of bodies) {
      const response = await call(createIssue as never, {
        method: 'POST',
        url: '/api/v1/issues',
        as: 'recruitA',
        body,
      });
      expect(response.status).toBe(422);
    }
  });
});

describe('PATCH /issues/{id}', () => {
  it('updates the caller’s own issue and derives resolved_at', async () => {
    const id = await seedIssue('recruitA');
    const response = await call(patchIssue as never, {
      method: 'PATCH',
      url: `/api/v1/issues/${id}`,
      as: 'recruitA',
      id,
      body: { status: 'RESOLVED', resolution_notes: 'The access request was approved.' },
    });

    expect(response.status).toBe(200);
    const issue = response.json.data as IssuePayload;
    expect(issue.status).toBe('RESOLVED');
    expect(issue.resolved_at).not.toBeNull();
    expect(issue.version).toBe(2);
  });

  it('clears resolved_at when an issue is reopened (C2)', async () => {
    const id = await seedIssue('recruitA', {
      status: 'RESOLVED',
      resolutionNotes: 'Resolved during the first week.',
      resolvedAt: new Date('2026-01-16'),
    });

    const response = await call(patchIssue as never, {
      method: 'PATCH',
      url: `/api/v1/issues/${id}`,
      as: 'recruitA',
      id,
      body: { status: 'OPEN' },
    });

    expect(response.status).toBe(200);
    expect((response.json.data as IssuePayload).resolved_at).toBeNull();
  });

  it('refuses to resolve an issue that has no resolution notes', async () => {
    const id = await seedIssue('recruitA');
    const response = await call(patchIssue as never, {
      method: 'PATCH',
      url: `/api/v1/issues/${id}`,
      as: 'recruitA',
      id,
      body: { status: 'RESOLVED' },
    });

    expect(response.status).toBe(422);
    const after = await prisma.issueEntry.findUniqueOrThrow({ where: { id } });
    expect(after.status).toBe('OPEN');
  });

  it('lets a manager triage a report’s issue — status and resolution notes only', async () => {
    const id = await seedIssue('recruitA');
    const response = await call(patchIssue as never, {
      method: 'PATCH',
      url: `/api/v1/issues/${id}`,
      as: 'managerA',
      id,
      body: { status: 'IN_PROGRESS', resolution_notes: 'Raised with IT, awaiting a licence.' },
    });

    expect(response.status).toBe(200);
    const issue = response.json.data as IssuePayload;
    expect(issue.status).toBe('IN_PROGRESS');
    expect(issue.owner.id).toBe(users.recruitA.id);

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'ENTRY.CROSS_USER_UPDATED', entityId: id },
    });
    expect(audit?.actorUserId).toBe(users.managerA.id);
  });

  it('refuses a manager rewriting any other field, and writes nothing at all', async () => {
    const id = await seedIssue('recruitA', { title: 'Untouched by the manager' });
    const response = await call(patchIssue as never, {
      method: 'PATCH',
      url: `/api/v1/issues/${id}`,
      as: 'managerA',
      id,
      // Mixed with a permitted field on purpose: the check is all-or-nothing.
      body: { status: 'IN_PROGRESS', title: 'Rewritten by the manager' },
    });

    expect(response.status).toBe(403);
    expect(response.json.error?.code).toBe('FIELD_NOT_PERMITTED');
    const after = await prisma.issueEntry.findUniqueOrThrow({ where: { id } });
    expect(after.title).toBe('Untouched by the manager');
    expect(after.status).toBe('OPEN');
  });

  it('refuses a manager triaging another manager’s recruit with a 404', async () => {
    const id = await seedIssue('recruitB');
    const response = await call(patchIssue as never, {
      method: 'PATCH',
      url: `/api/v1/issues/${id}`,
      as: 'managerA',
      id,
      body: { status: 'IN_PROGRESS' },
    });
    expect(response.status).toBe(404);
  });

  it('rejects an attempt to reassign ownership', async () => {
    const id = await seedIssue('recruitA');
    const response = await call(patchIssue as never, {
      method: 'PATCH',
      url: `/api/v1/issues/${id}`,
      as: 'recruitA',
      id,
      body: { owner_id: users.recruitA2.id },
    });

    expect(response.status).toBe(422);
    const after = await prisma.issueEntry.findUniqueOrThrow({ where: { id } });
    expect(after.ownerId).toBe(users.recruitA.id);
  });

  it('refuses a stale expected_version with 409 and leaves the row alone', async () => {
    const id = await seedIssue('recruitA', { title: 'Concurrently edited' });
    await prisma.issueEntry.update({ where: { id }, data: { version: { increment: 1 } } });

    const response = await call(patchIssue as never, {
      method: 'PATCH',
      url: `/api/v1/issues/${id}`,
      as: 'recruitA',
      id,
      body: { title: 'Written over a stale read', expected_version: 1 },
    });

    expect(response.status).toBe(409);
    expect(response.json.error?.code).toBe('VERSION_CONFLICT');
    const after = await prisma.issueEntry.findUniqueOrThrow({ where: { id } });
    expect(after.title).toBe('Concurrently edited');
  });

  it('answers 404 for an invisible id before it considers the version', async () => {
    const id = await seedIssue('recruitB');
    const response = await call(patchIssue as never, {
      method: 'PATCH',
      url: `/api/v1/issues/${id}`,
      as: 'recruitA',
      id,
      body: { status: 'CLOSED', expected_version: 99 },
    });
    expect(response.status).toBe(404);
  });
});

describe('DELETE /issues/{id}', () => {
  it('soft-deletes the caller’s own issue and hides it from every later read', async () => {
    const id = await seedIssue('recruitA');
    const response = await call(deleteIssue as never, {
      method: 'DELETE',
      url: `/api/v1/issues/${id}`,
      as: 'recruitA',
      id,
    });

    expect(response.status).toBe(204);
    expect((await prisma.issueEntry.findUniqueOrThrow({ where: { id } })).deletedAt).not.toBeNull();
    expect((await call(getIssue as never, { url: `/x/${id}`, as: 'recruitA', id })).status).toBe(404);
  });

  it('refuses a manager deleting a report’s issue even though they may triage it', async () => {
    const id = await seedIssue('recruitA');
    const response = await call(deleteIssue as never, {
      method: 'DELETE',
      url: `/api/v1/issues/${id}`,
      as: 'managerA',
      id,
    });

    expect(response.status).toBe(403);
    expect((await prisma.issueEntry.findUniqueOrThrow({ where: { id } })).deletedAt).toBeNull();
  });
});

describe('filters, sorting and pagination stay inside the scope', () => {
  it('applies status and severity filters without widening the owner set', async () => {
    const response = await list({
      as: 'managerA',
      url: '/api/v1/issues?status=OPEN,IN_PROGRESS&severity=HIGH,CRITICAL&page_size=100',
    });

    const items = rowsOf(response.json);
    expect(items.every((issue) => ['OPEN', 'IN_PROGRESS'].includes(issue.status))).toBe(true);
    expect(items.every((issue) => ['HIGH', 'CRITICAL'].includes(issue.severity))).toBe(true);
    expect(items.some((issue) => issue.owner.id === users.recruitB.id)).toBe(false);
  });

  it('rejects an invalid member of a CSV enum filter rather than dropping it', async () => {
    const response = await list({ as: 'recruitA', url: '/api/v1/issues?status=OPEN,NONSENSE' });
    expect(response.status).toBe(422);
  });

  it('rejects a sort field that is not on the allow-list', async () => {
    expect((await list({ as: 'recruitA', url: '/api/v1/issues?sort=owner_id' })).status).toBe(422);
  });

  it('rejects an unknown query parameter rather than ignoring it', async () => {
    expect((await list({ as: 'recruitA', url: '/api/v1/issues?deleted_at=null' })).status).toBe(422);
  });

  it('rejects a reversed date range', async () => {
    const response = await list({
      as: 'recruitA',
      url: '/api/v1/issues?date_from=2026-03-01&date_to=2026-01-01',
    });
    expect(response.status).toBe(422);
  });

  it('counts only rows the caller may see', async () => {
    const response = await list({ as: 'recruitA', url: '/api/v1/issues?page_size=100' });
    const page = response.json.data as { page: { total: number } };
    const actual = await prisma.issueEntry.count({
      where: { ownerId: users.recruitA.id, deletedAt: null },
    });
    expect(page.page.total).toBe(actual);
  });

  it('pages deterministically', async () => {
    const first = await list({ as: 'admin', url: '/api/v1/issues?page=1&page_size=5' });
    const second = await list({ as: 'admin', url: '/api/v1/issues?page=2&page_size=5' });

    const firstIds = rowsOf(first.json).map((issue) => issue.id);
    const secondIds = rowsOf(second.json).map((issue) => issue.id);
    expect(firstIds).toHaveLength(5);
    expect(firstIds.some((id) => secondIds.includes(id))).toBe(false);
  });
});
