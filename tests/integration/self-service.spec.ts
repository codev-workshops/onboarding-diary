/**
 * `/users/me`, the password endpoints and `/users/{id}/recruits`, through the
 * real handlers against seeded Postgres.
 *
 * The interesting cases are the ones where the caller is entitled to *some* of
 * what they asked for: a recruit may rename themselves but not promote
 * themselves (AZ-R5, whole request refused), and an account holding a temporary
 * password may change it and nothing else (US-70), which is the only thing
 * standing between an admin-issued password and a working account.
 *
 * Requires a seeded database (`npm run db:reset`).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GET as meGet, PATCH as mePatch } from '@/app/api/v1/users/me/route';
import { POST as passwordPost } from '@/app/api/v1/users/me/password/route';
import { POST as resetPost } from '@/app/api/v1/users/[id]/reset-password/route';
import { GET as recruitsGet } from '@/app/api/v1/users/[id]/recruits/route';
import { POST as loginPost } from '@/app/api/v1/auth/login/route';
import { POST as logoutPost } from '@/app/api/v1/auth/logout/route';
import { GET as tasksGet } from '@/app/api/v1/tasks/route';
import { hashPassword, verifyPassword } from '@/src/modules/auth/password';
import { SESSION_COOKIE, signSession } from '@/src/modules/auth/session';
import type { SelfProfile, UserSummary } from '@/src/modules/users/dto';
import { prisma } from '@/src/shared/db/prisma';

const EMAILS = {
  admin: 'admin@onboarding.test',
  managerA: 'marcus.bell@onboarding.test',
  managerB: 'dana.lee@onboarding.test',
  recruitA: 'priya.sharma@onboarding.test',
} as const;

type Key = keyof typeof EMAILS;
type Json = { data?: unknown; error?: { code: string; message: string; details?: { field: string }[] } };
type Handler = (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;

const actors = {} as Record<Key, { id: string; cookie: string }>;
const createdUsers: string[] = [];

async function call(
  handler: Handler,
  options: { method?: string; url: string; cookie?: string; id?: string; body?: unknown }
): Promise<{ status: number; json: Json }> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (options.cookie) headers.cookie = options.cookie;

  const request = new Request(`http://localhost${options.url}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const response = await handler(request, { params: Promise.resolve({ id: options.id ?? '' }) });
  const json = response.status === 204 ? {} : ((await response.json()) as Json);

  return { status: response.status, json };
}

const errorCode = (json: Json) => json.error?.code;

/** A throwaway account with a known password, tracked for teardown. */
async function makeUser(
  password: string,
  mustChangePassword = false
): Promise<{ id: string; cookie: string }> {
  const user = await prisma.user.create({
    data: {
      email: `m10-self-${crypto.randomUUID()}@onboarding.test`,
      passwordHash: await hashPassword(password),
      fullName: 'M10 Self Fixture',
      role: 'RECRUIT',
      startDate: new Date('2026-01-05T00:00:00Z'),
      mustChangePassword,
    },
    select: { id: true },
  });

  createdUsers.push(user.id);
  return { id: user.id, cookie: `${SESSION_COOKIE}=${await signSession(user.id)}` };
}

beforeAll(async () => {
  for (const [key, email] of Object.entries(EMAILS) as [Key, string][]) {
    const user = await prisma.user.findUniqueOrThrow({ where: { email }, select: { id: true } });
    actors[key] = { id: user.id, cookie: `${SESSION_COOKIE}=${await signSession(user.id)}` };
  }
});

afterAll(async () => {
  await prisma.user.update({
    where: { id: actors.recruitA.id },
    data: { fullName: 'Priya Sharma' },
  });

  if (createdUsers.length > 0) {
    // See `admin-endpoints.spec.ts`: `audit_logs` is append-only, so teardown
    // lifts the trigger it is this suite's job to respect everywhere else.
    await prisma.$executeRawUnsafe('ALTER TABLE "audit_logs" DISABLE TRIGGER "audit_logs_no_update_delete"');
    try {
      await prisma.auditLog.deleteMany({
        where: { OR: [{ actorUserId: { in: createdUsers } }, { targetUserId: { in: createdUsers } }] },
      });
      await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
    } finally {
      await prisma.$executeRawUnsafe('ALTER TABLE "audit_logs" ENABLE TRIGGER "audit_logs_no_update_delete"');
    }
  }
});

describe('/users/me', () => {
  it('is readable by a recruit, who has no directory at all', async () => {
    const response = await call(meGet as Handler, {
      url: '/api/v1/users/me',
      cookie: actors.recruitA.cookie,
    });

    expect(response.status).toBe(200);
    expect((response.json.data as SelfProfile).id).toBe(actors.recruitA.id);
  });

  it('accepts a rename from the owner', async () => {
    const response = await call(mePatch as Handler, {
      method: 'PATCH',
      url: '/api/v1/users/me',
      cookie: actors.recruitA.cookie,
      body: { full_name: 'Priya S. Sharma' },
    });

    expect(response.status).toBe(200);
    expect((response.json.data as SelfProfile).full_name).toBe('Priya S. Sharma');
  });

  it.each([
    ['role', { role: 'ADMIN' }],
    ['manager_id', { manager_id: null }],
    ['is_active', { is_active: true }],
    ['email', { email: 'new@onboarding.test' }],
  ])('refuses the whole request when it names %s', async (field, body) => {
    const response = await call(mePatch as Handler, {
      method: 'PATCH',
      url: '/api/v1/users/me',
      cookie: actors.recruitA.cookie,
      body: { full_name: 'Escalation Attempt', ...body },
    });

    expect(response.status).toBe(403);
    expect(errorCode(response.json)).toBe('FORBIDDEN_FIELD');
    expect(response.json.error?.details?.map((detail) => detail.field)).toContain(field);

    const after = await prisma.user.findUniqueOrThrow({
      where: { id: actors.recruitA.id },
      select: { fullName: true, role: true },
    });
    expect(after.role).toBe('RECRUIT');
    expect(after.fullName).not.toBe('Escalation Attempt');
  });

  it('answers 401 to an anonymous caller', async () => {
    const response = await call(meGet as Handler, { url: '/api/v1/users/me' });
    expect(response.status).toBe(401);
  });
});

describe('changing one own password', () => {
  it('refuses a wrong current password and leaves the hash alone', async () => {
    const user = await makeUser('Passw0rd!23');

    const response = await call(passwordPost as Handler, {
      method: 'POST',
      url: '/api/v1/users/me/password',
      cookie: user.cookie,
      body: { current_password: 'NotTheOne!1', new_password: 'BrandNewPass1' },
    });

    expect(response.status).toBe(401);
    const stored = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    expect(await verifyPassword('Passw0rd!23', stored.passwordHash)).toBe(true);
  });

  it('refuses a new password that fails the policy', async () => {
    const user = await makeUser('Passw0rd!23');

    const response = await call(passwordPost as Handler, {
      method: 'POST',
      url: '/api/v1/users/me/password',
      cookie: user.cookie,
      body: { current_password: 'Passw0rd!23', new_password: 'short1A' },
    });

    expect(response.status).toBe(422);
  });

  it('stores the new password and records the change without the password itself', async () => {
    const user = await makeUser('Passw0rd!23');

    const response = await call(passwordPost as Handler, {
      method: 'POST',
      url: '/api/v1/users/me/password',
      cookie: user.cookie,
      body: { current_password: 'Passw0rd!23', new_password: 'ReplacedPass1' },
    });

    expect(response.status).toBe(204);
    const stored = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    expect(await verifyPassword('ReplacedPass1', stored.passwordHash)).toBe(true);

    const audit = await prisma.auditLog.findFirst({
      where: { targetUserId: user.id, action: 'AUTH.PASSWORD_CHANGED' },
    });
    expect(audit).not.toBeNull();
    expect(JSON.stringify(audit?.after)).not.toContain('ReplacedPass1');
  });
});

describe('a temporary password', () => {
  it('reaches the password endpoint and nothing else', async () => {
    const user = await makeUser('Temporary!1', true);

    const blocked = await call(tasksGet as Handler, { url: '/api/v1/tasks', cookie: user.cookie });
    expect(blocked.status).toBe(403);
    expect(errorCode(blocked.json)).toBe('PASSWORD_CHANGE_REQUIRED');

    const profile = await call(meGet as Handler, { url: '/api/v1/users/me', cookie: user.cookie });
    expect(profile.status).toBe(200);
    expect((profile.json.data as SelfProfile).must_change_password).toBe(true);

    const changed = await call(passwordPost as Handler, {
      method: 'POST',
      url: '/api/v1/users/me/password',
      cookie: user.cookie,
      body: { current_password: 'Temporary!1', new_password: 'ChosenPass1' },
    });
    expect(changed.status).toBe(204);

    const afterwards = await call(tasksGet as Handler, { url: '/api/v1/tasks', cookie: user.cookie });
    expect(afterwards.status).toBe(200);
  });

  it('is what an admin reset puts the account back into', async () => {
    const user = await makeUser('Passw0rd!23');

    const reset = await call(resetPost as Handler, {
      method: 'POST',
      url: `/api/v1/users/${user.id}/reset-password`,
      cookie: actors.admin.cookie,
      id: user.id,
      body: {},
    });

    expect(reset.status).toBe(200);
    const issued = (reset.json.data as { temporary_password: string }).temporary_password;

    const stored = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { passwordHash: true, mustChangePassword: true },
    });
    expect(stored.mustChangePassword).toBe(true);
    expect(await verifyPassword(issued, stored.passwordHash)).toBe(true);
    expect(await verifyPassword('Passw0rd!23', stored.passwordHash)).toBe(false);

    const audit = await prisma.auditLog.findFirst({
      where: { targetUserId: user.id, action: 'AUTH.PASSWORD_RESET' },
    });
    expect(audit).not.toBeNull();
    expect(JSON.stringify(audit?.after)).not.toContain(issued);
  });

  it('cannot be issued by a manager or for an unknown user', async () => {
    const user = await makeUser('Passw0rd!23');

    const byManager = await call(resetPost as Handler, {
      method: 'POST',
      url: `/api/v1/users/${user.id}/reset-password`,
      cookie: actors.managerA.cookie,
      id: user.id,
      body: {},
    });
    expect(byManager.status).toBe(403);
    expect(errorCode(byManager.json)).toBe('INSUFFICIENT_ROLE');

    const unknown = crypto.randomUUID();
    const missing = await call(resetPost as Handler, {
      method: 'POST',
      url: `/api/v1/users/${unknown}/reset-password`,
      cookie: actors.admin.cookie,
      id: unknown,
      body: {},
    });
    expect(missing.status).toBe(404);
  });
});

describe('authentication auditing', () => {
  it('records a success, a failure and a sign-out, and never the password', async () => {
    const user = await makeUser('Passw0rd!23');
    const email = await prisma.user
      .findUniqueOrThrow({ where: { id: user.id }, select: { email: true } })
      .then((row) => row.email);

    const failed = await call(loginPost as Handler, {
      method: 'POST',
      url: '/api/v1/auth/login',
      body: { email, password: 'WrongPassword1' },
    });
    expect(failed.status).toBe(401);

    const success = await call(loginPost as Handler, {
      method: 'POST',
      url: '/api/v1/auth/login',
      body: { email, password: 'Passw0rd!23' },
    });
    expect(success.status).toBe(200);

    const signedOut = await call(logoutPost as Handler, {
      method: 'POST',
      url: '/api/v1/auth/logout',
      cookie: user.cookie,
      body: {},
    });
    expect(signedOut.status).toBe(204);

    const rows = await prisma.auditLog.findMany({ where: { targetUserId: user.id } });
    const actions = rows.map((row) => row.action);
    expect(actions).toContain('AUTH.LOGIN_FAILED');
    expect(actions).toContain('AUTH.LOGIN_SUCCESS');
    expect(actions).toContain('AUTH.LOGOUT');
    expect(JSON.stringify(rows.map((row) => row.after))).not.toContain('Passw0rd!23');
    expect(JSON.stringify(rows.map((row) => row.after))).not.toContain('WrongPassword1');
  });
});

describe('/users/{id}/recruits', () => {
  it('gives a manager their own direct reports', async () => {
    const response = await call(recruitsGet as Handler, {
      url: `/api/v1/users/${actors.managerA.id}/recruits`,
      cookie: actors.managerA.cookie,
      id: actors.managerA.id,
    });

    expect(response.status).toBe(200);
    const reports = response.json.data as UserSummary[];
    expect(reports.length).toBeGreaterThan(0);
    expect(reports.every((report) => report.manager_id === actors.managerA.id)).toBe(true);
  });

  it('answers 404 when a manager asks about another manager, and serves an admin', async () => {
    const asManager = await call(recruitsGet as Handler, {
      url: `/api/v1/users/${actors.managerB.id}/recruits`,
      cookie: actors.managerA.cookie,
      id: actors.managerB.id,
    });
    expect(asManager.status).toBe(404);

    const asAdmin = await call(recruitsGet as Handler, {
      url: `/api/v1/users/${actors.managerB.id}/recruits`,
      cookie: actors.admin.cookie,
      id: actors.managerB.id,
    });
    expect(asAdmin.status).toBe(200);
    expect((asAdmin.json.data as UserSummary[]).length).toBeGreaterThan(0);
  });

  it('refuses a recruit, who has no directory', async () => {
    const response = await call(recruitsGet as Handler, {
      url: `/api/v1/users/${actors.recruitA.id}/recruits`,
      cookie: actors.recruitA.cookie,
      id: actors.recruitA.id,
    });

    expect(response.status).toBe(403);
    expect(errorCode(response.json)).toBe('INSUFFICIENT_ROLE');
  });
});
