/**
 * The dashboard endpoints against seeded Postgres, through the real handlers.
 *
 * An aggregate is a quieter disclosure than a list — a count does not look like
 * somebody's diary — so these tests care less about which numbers appear than
 * about which rows were allowed to contribute to them: a manager's totals must
 * not move when their report writes a private note, and must not move when
 * another manager's recruit does anything at all.
 *
 * Requires a seeded database (`npm run db:reset`); every row written here is
 * removed again in `afterAll`.
 */
import type { UserRole } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GET as meRoute } from '@/app/api/v1/dashboard/me/route';
import { GET as orgRoute } from '@/app/api/v1/dashboard/org/route';
import { GET as teamRoute } from '@/app/api/v1/dashboard/team/route';
import { GET as userRoute } from '@/app/api/v1/dashboard/users/[id]/route';
import { SESSION_COOKIE, signSession } from '@/src/modules/auth/session';
import type { OrgDashboard, TeamDashboard, UserDashboard } from '@/src/modules/dashboard/dto';
import { prisma } from '@/src/shared/db/prisma';

const EMAILS = {
  admin: 'admin@onboarding.test',
  managerA: 'marcus.bell@onboarding.test',
  managerB: 'dana.lee@onboarding.test',
  recruitA: 'priya.sharma@onboarding.test',
  recruitB: 'aisha.khan@onboarding.test',
  unassigned: 'noah.silva@onboarding.test',
} as const;

type Key = keyof typeof EMAILS;

const users = {} as Record<Key, { id: string; role: UserRole; cookie: string }>;
const created = {
  tasks: [] as string[],
  issues: [] as string[],
  feedback: [] as string[],
  notes: [] as string[],
};

type Json = { data?: unknown; error?: { code: string; message: string } };

const today = new Date();
const recently = new Date(today.getTime() - 2 * 86_400_000);

async function call(
  handler: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>,
  options: { url: string; as?: Key; id?: string }
): Promise<{ status: number; json: Json }> {
  const headers: Record<string, string> = {};
  if (options.as) headers.cookie = users[options.as].cookie;

  const request = new Request(`http://localhost${options.url}`, { headers });
  const response = await handler(request, { params: Promise.resolve({ id: options.id ?? '' }) });

  return { status: response.status, json: (await response.json()) as Json };
}

const me = (as?: Key, query = '') => call(meRoute as never, { url: `/api/v1/dashboard/me${query}`, as });
const team = (as?: Key, query = '') =>
  call(teamRoute as never, { url: `/api/v1/dashboard/team${query}`, as });
const org = (as?: Key, query = '') => call(orgRoute as never, { url: `/api/v1/dashboard/org${query}`, as });
const forUser = (as: Key, id: string) =>
  call(userRoute as never, { url: `/api/v1/dashboard/users/${id}`, as, id });

const userData = (json: Json) => json.data as UserDashboard;
const teamData = (json: Json) => json.data as TeamDashboard;
const orgData = (json: Json) => json.data as OrgDashboard;

const memberOf = (dashboard: TeamDashboard, id: string) =>
  dashboard.members.find((member) => member.user.id === id);

async function seedTask(ownerKey: Key, overrides: Record<string, unknown> = {}): Promise<string> {
  const row = await prisma.taskEntry.create({
    data: {
      ownerId: users[ownerKey].id,
      updatedById: users[ownerKey].id,
      entryDate: recently,
      title: 'Dashboard fixture task',
      category: 'SETUP',
      status: 'TODO',
      priority: 'MEDIUM',
      ...overrides,
    },
    select: { id: true },
  });
  created.tasks.push(row.id);
  return row.id;
}

async function seedIssue(ownerKey: Key, overrides: Record<string, unknown> = {}): Promise<string> {
  const row = await prisma.issueEntry.create({
    data: {
      ownerId: users[ownerKey].id,
      updatedById: users[ownerKey].id,
      entryDate: recently,
      title: 'Dashboard fixture issue',
      description: 'Something is blocking the recruit.',
      severity: 'LOW',
      status: 'OPEN',
      ...overrides,
    },
    select: { id: true },
  });
  created.issues.push(row.id);
  return row.id;
}

async function seedFeedback(ownerKey: Key, overrides: Record<string, unknown> = {}): Promise<string> {
  const row = await prisma.feedbackEntry.create({
    data: {
      ownerId: users[ownerKey].id,
      updatedById: users[ownerKey].id,
      entryDate: recently,
      subject: 'Dashboard fixture feedback',
      type: 'SUGGESTION',
      details: 'A thought about the first two weeks.',
      ...overrides,
    },
    select: { id: true },
  });
  created.feedback.push(row.id);
  return row.id;
}

async function seedNote(ownerKey: Key, overrides: Record<string, unknown> = {}): Promise<string> {
  const row = await prisma.noteEntry.create({
    data: {
      ownerId: users[ownerKey].id,
      updatedById: users[ownerKey].id,
      entryDate: recently,
      title: 'Dashboard fixture note',
      content: 'Private scribble.',
      ...overrides,
    },
    select: { id: true },
  });
  created.notes.push(row.id);
  return row.id;
}

beforeAll(async () => {
  const rows = await prisma.user.findMany({
    where: { email: { in: Object.values(EMAILS) } },
    select: { id: true, email: true, role: true },
  });

  for (const [key, email] of Object.entries(EMAILS) as [Key, string][]) {
    const row = rows.find((candidate) => candidate.email === email);
    if (!row) throw new Error(`Seed fixture missing: ${email}. Run npm run db:reset.`);
    users[key] = { id: row.id, role: row.role, cookie: `${SESSION_COOKIE}=${await signSession(row.id)}` };
  }
});

afterAll(async () => {
  await prisma.taskEntry.deleteMany({ where: { id: { in: created.tasks } } });
  await prisma.issueEntry.deleteMany({ where: { id: { in: created.issues } } });
  await prisma.feedbackEntry.deleteMany({ where: { id: { in: created.feedback } } });
  await prisma.noteEntry.deleteMany({ where: { id: { in: created.notes } } });
  await prisma.$disconnect();
});

describe('authentication', () => {
  it('refuses anonymous callers on every dashboard rather than serving an empty one', async () => {
    for (const response of [await me(), await team(), await org()]) {
      expect(response.status).toBe(401);
      expect(response.json.error?.code).toBe('UNAUTHENTICATED');
    }
  });

  it('refuses a well-formed cookie for a deactivated user', async () => {
    const id = users.unassigned.id;
    await prisma.user.update({ where: { id }, data: { isActive: false } });
    try {
      expect((await me('unassigned')).status).toBe(401);
    } finally {
      await prisma.user.update({ where: { id }, data: { isActive: true } });
    }
  });
});

describe('GET /dashboard/me', () => {
  it('summarises the caller and nobody else', async () => {
    await seedTask('recruitA', { status: 'DONE', completedAt: recently });
    const response = await me('recruitA');

    expect(response.status).toBe(200);
    expect(userData(response.json).user.id).toBe(users.recruitA.id);
    expect(userData(response.json).recent_entries.every((row) => row.owner.id === users.recruitA.id)).toBe(
      true
    );
  });

  it('gives a manager their own diary here, not their team’s', async () => {
    await seedTask('recruitA');
    const response = await me('managerA');

    expect(userData(response.json).user.id).toBe(users.managerA.id);
    expect(userData(response.json).open_issues.every((row) => row.owner.id === users.managerA.id)).toBe(true);
  });

  it('honours the period and refuses one that is not offered', async () => {
    expect(userData((await me('recruitA', '?days=7')).json).period.days).toBe(7);
    expect((await me('recruitA', '?days=1000')).status).toBe(422);
  });

  it('counts the recruit’s own notes, and never exposes an email address', async () => {
    const before = userData((await me('recruitA')).json).summary.notes_total;
    await seedNote('recruitA');
    const after = userData((await me('recruitA')).json).summary.notes_total;

    expect(after).toBe(before + 1);
    expect(JSON.stringify((await me('recruitA')).json)).not.toContain('@onboarding.test');
  });

  it('excludes soft-deleted entries from the counts', async () => {
    const before = userData((await me('recruitB')).json).summary.tasks_total;
    await seedTask('recruitB', { deletedAt: new Date() });

    expect(userData((await me('recruitB')).json).summary.tasks_total).toBe(before);
  });

  it('excludes cancelled tasks from the completion denominator (C3)', async () => {
    const dashboard = userData((await me('recruitA')).json).summary;
    const eligible = dashboard.tasks_total - dashboard.tasks_cancelled;
    const expected = eligible <= 0 ? 0 : Math.round((1000 * dashboard.tasks_done) / eligible) / 10;

    expect(dashboard.task_completion_pct).toBe(expected);
  });
});

describe('GET /dashboard/team', () => {
  it('refuses a recruit outright (AZ-R2)', async () => {
    const response = await team('recruitA');
    expect(response.status).toBe(403);
    expect(response.json.error?.code).toBe('INSUFFICIENT_ROLE');
  });

  it('lists a manager’s direct reports and nobody else’s', async () => {
    const response = await team('managerA');
    expect(response.status).toBe(200);

    expect(memberOf(teamData(response.json), users.recruitA.id)).toBeDefined();
    expect(memberOf(teamData(response.json), users.recruitB.id)).toBeUndefined();
    expect(memberOf(teamData(response.json), users.unassigned.id)).toBeUndefined();
  });

  it('never counts a report’s private notes (AZ-M4)', async () => {
    await seedNote('recruitA');
    const response = await team('managerA');

    expect(memberOf(teamData(response.json), users.recruitA.id)?.summary.notes_total).toBe(0);
    expect(teamData(response.json).totals.notes_total).toBe(0);
  });

  it('excludes admin-only feedback from a manager’s counts but keeps it for the admin', async () => {
    const managerBefore = memberOf(teamData((await team('managerA')).json), users.recruitA.id)!.summary
      .feedback_total;
    const adminBefore = userData((await forUser('admin', users.recruitA.id)).json).summary.feedback_total;

    await seedFeedback('recruitA', { visibility: 'ADMIN_ONLY' });

    expect(memberOf(teamData((await team('managerA')).json), users.recruitA.id)?.summary.feedback_total).toBe(
      managerBefore
    );
    expect(userData((await forUser('admin', users.recruitA.id)).json).summary.feedback_total).toBe(
      adminBefore + 1
    );
  });

  it('counts a critical open issue for the right recruit only', async () => {
    await seedIssue('recruitA', { severity: 'CRITICAL', status: 'OPEN' });
    const response = teamData((await team('managerA')).json);

    expect(memberOf(response, users.recruitA.id)!.summary.issues_critical_open).toBeGreaterThan(0);
    expect(response.totals.issues_critical_open).toBeGreaterThan(0);
  });

  it('follows a reassignment on the next request, with no cached scope', async () => {
    const id = users.recruitB.id;
    const original = (await prisma.user.findUniqueOrThrow({ where: { id }, select: { managerId: true } }))
      .managerId;

    await prisma.user.update({ where: { id }, data: { managerId: users.managerA.id } });
    try {
      expect(memberOf(teamData((await team('managerA')).json), id)).toBeDefined();
      expect(memberOf(teamData((await team('managerB')).json), id)).toBeUndefined();
    } finally {
      await prisma.user.update({ where: { id }, data: { managerId: original } });
    }

    expect(memberOf(teamData((await team('managerA')).json), id)).toBeUndefined();
  });

  it('shows an admin every recruit, including the unassigned one', async () => {
    const response = teamData((await team('admin')).json);

    expect(memberOf(response, users.unassigned.id)).toBeDefined();
    expect(response.totals.recruits).toBeGreaterThanOrEqual(7);
  });

  it('never exposes an email address in the roster', async () => {
    expect(JSON.stringify((await team('admin')).json)).not.toContain('@onboarding.test');
  });
});

describe('GET /dashboard/users/:id', () => {
  it('lets a manager open a direct report', async () => {
    const response = await forUser('managerA', users.recruitA.id);

    expect(response.status).toBe(200);
    expect(userData(response.json).user.id).toBe(users.recruitA.id);
  });

  it('refuses another manager’s recruit with 403 OUT_OF_SCOPE (AZ-M2)', async () => {
    const response = await forUser('managerA', users.recruitB.id);

    expect(response.status).toBe(403);
    expect(response.json.error?.code).toBe('OUT_OF_SCOPE');
  });

  it('refuses an unassigned recruit — scope is the manager link, not the role (AZ-M3)', async () => {
    expect((await forUser('managerA', users.unassigned.id)).status).toBe(403);
  });

  it('refuses a recruit reading a peer, and allows them their own id', async () => {
    expect((await forUser('recruitA', users.recruitB.id)).status).toBe(403);
    expect((await forUser('recruitA', users.recruitA.id)).status).toBe(200);
  });

  it('reports a report’s notes as zero rather than refusing the whole dashboard', async () => {
    await seedNote('recruitA');
    const response = await forUser('managerA', users.recruitA.id);

    expect(response.status).toBe(200);
    expect(userData(response.json).summary.notes_total).toBe(0);
    expect(userData(response.json).recent_entries.some((row) => row.kind === 'NOTE')).toBe(false);
  });

  it('answers alike for a missing id and a malformed one', async () => {
    const missing = '00000000-0000-4000-8000-000000000000';
    const absent = await forUser('admin', missing);
    const malformed = await forUser('admin', 'not-a-uuid');

    expect(absent.status).toBe(404);
    expect(malformed.status).toBe(404);
    expect(malformed.json.error?.code).toBe(absent.json.error?.code);
  });
});

describe('GET /dashboard/org', () => {
  it('is admin-only', async () => {
    expect((await org('recruitA')).status).toBe(403);
    expect((await org('managerA')).status).toBe(403);
    expect((await org('admin')).status).toBe(200);
  });

  it('covers the whole organisation, including recruits no manager can see', async () => {
    const response = orgData((await org('admin')).json);

    expect(response.totals.recruits).toBeGreaterThanOrEqual(7);
    expect(response.unassigned_recruits.map((row) => row.id)).toContain(users.unassigned.id);
    expect(response.departments.length).toBeGreaterThan(0);
  });

  it('reconciles department rollups with the organisation totals', async () => {
    const response = orgData((await org('admin')).json);
    const summed = response.departments.reduce((total, row) => total + row.recruits, 0);

    expect(summed).toBe(response.totals.recruits);
  });

  it('never exposes an email address', async () => {
    expect(JSON.stringify((await org('admin')).json)).not.toContain('@onboarding.test');
  });
});
