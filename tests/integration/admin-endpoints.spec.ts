/**
 * The admin user and department endpoints against seeded Postgres, through the
 * real handlers.
 *
 * Administration is the one place where a request legitimately changes who may
 * read whose diary, so most of these tests are about the refusals: the last
 * admin cannot be removed, a manager cannot be demoted out from under their
 * reports, a reporting line cannot become a loop, and nobody but an admin can
 * ask for any of it. The rest prove the change is real — a reassigned recruit
 * moves between managers' scopes on the next request, not on the next login.
 *
 * Requires a seeded database (`npm run db:reset`); every row written here is
 * removed again in `afterAll`.
 */
import type { UserRole } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GET as departmentsGet, POST as departmentsPost } from '@/app/api/v1/departments/route';
import { DELETE as departmentDelete, PATCH as departmentPatch } from '@/app/api/v1/departments/[id]/route';
import { GET as usersGet, POST as usersPost } from '@/app/api/v1/users/route';
import { GET as userGet, PATCH as userPatch } from '@/app/api/v1/users/[id]/route';
import { POST as deactivatePost } from '@/app/api/v1/users/[id]/deactivate/route';
import { POST as reactivatePost } from '@/app/api/v1/users/[id]/reactivate/route';
import { verifyPassword } from '@/src/modules/auth/password';
import { SESSION_COOKIE, signSession } from '@/src/modules/auth/session';
import type { DepartmentView } from '@/src/modules/departments/admin-service';
import type { AdminUserView, UserSummary } from '@/src/modules/users/dto';
import { prisma } from '@/src/shared/db/prisma';

const EMAILS = {
  admin: 'admin@onboarding.test',
  managerA: 'marcus.bell@onboarding.test',
  managerB: 'dana.lee@onboarding.test',
  recruitA: 'priya.sharma@onboarding.test',
} as const;

type Key = keyof typeof EMAILS;

const actors = {} as Record<Key, { id: string; role: UserRole; cookie: string }>;
const createdUsers: string[] = [];
const createdDepartments: string[] = [];

type Json = { data?: unknown; error?: { code: string; message: string; details?: unknown[] } };
type Handler = (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;

async function call(
  handler: Handler,
  options: { method?: string; url: string; as?: Key; id?: string; body?: unknown }
): Promise<{ status: number; json: Json }> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (options.as) headers.cookie = actors[options.as].cookie;

  const request = new Request(`http://localhost${options.url}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const response = await handler(request, { params: Promise.resolve({ id: options.id ?? '' }) });
  const json = response.status === 204 ? {} : ((await response.json()) as Json);

  return { status: response.status, json };
}

const listUsers = (as?: Key, query = '') => call(usersGet as Handler, { url: `/api/v1/users${query}`, as });
const getUser = (as: Key, id: string) => call(userGet as Handler, { url: `/api/v1/users/${id}`, as, id });
const createUser = (as: Key, body: unknown) =>
  call(usersPost as Handler, { method: 'POST', url: '/api/v1/users', as, body });
const patchUser = (as: Key, id: string, body: unknown) =>
  call(userPatch as Handler, { method: 'PATCH', url: `/api/v1/users/${id}`, as, id, body });
const deactivate = (as: Key, id: string, body: unknown = {}) =>
  call(deactivatePost as Handler, {
    method: 'POST',
    url: `/api/v1/users/${id}/deactivate`,
    as,
    id,
    body,
  });
const reactivate = (as: Key, id: string) =>
  call(reactivatePost as Handler, { method: 'POST', url: `/api/v1/users/${id}/reactivate`, as, id });

const listDepartments = (as?: Key, query = '') =>
  call(departmentsGet as Handler, { url: `/api/v1/departments${query}`, as });
const createDepartment = (as: Key, body: unknown) =>
  call(departmentsPost as Handler, { method: 'POST', url: '/api/v1/departments', as, body });
const patchDepartment = (as: Key, id: string, body: unknown) =>
  call(departmentPatch as Handler, { method: 'PATCH', url: `/api/v1/departments/${id}`, as, id, body });
const deleteDepartment = (as: Key, id: string) =>
  call(departmentDelete as Handler, { method: 'DELETE', url: `/api/v1/departments/${id}`, as, id });

const adminUsers = (json: Json) => json.data as AdminUserView[];
const adminUser = (json: Json) => json.data as AdminUserView;
const departments = (json: Json) => json.data as DepartmentView[];
const errorCode = (json: Json) => json.error?.code;

/** A throwaway account, tracked so `afterAll` can put the database back. */
async function makeUser(
  overrides: Partial<{ role: UserRole; managerId: string | null; isActive: boolean; email: string }> = {}
): Promise<string> {
  const user = await prisma.user.create({
    data: {
      email: overrides.email ?? `m10-${crypto.randomUUID()}@onboarding.test`,
      passwordHash: 'x'.repeat(60),
      fullName: 'M10 Fixture',
      role: overrides.role ?? 'RECRUIT',
      startDate: new Date('2026-01-05T00:00:00Z'),
      managerId: overrides.managerId ?? null,
      isActive: overrides.isActive ?? true,
    },
    select: { id: true },
  });

  createdUsers.push(user.id);
  return user.id;
}

async function makeDepartment(isActive = true): Promise<string> {
  const department = await prisma.department.create({
    data: { name: `M10 ${crypto.randomUUID().slice(0, 8)}`, isActive },
    select: { id: true },
  });

  createdDepartments.push(department.id);
  return department.id;
}

beforeAll(async () => {
  for (const [key, email] of Object.entries(EMAILS) as [Key, string][]) {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email },
      select: { id: true, role: true },
    });
    actors[key] = {
      id: user.id,
      role: user.role,
      cookie: `${SESSION_COOKIE}=${await signSession(user.id)}`,
    };
  }
});

afterAll(async () => {
  // Restore the seeded reporting line first: a test may have moved a seeded
  // recruit to a fixture manager that is about to disappear.
  await prisma.user.update({
    where: { id: actors.recruitA.id },
    data: { managerId: actors.managerA.id, isActive: true },
  });
  await prisma.user.update({ where: { id: actors.managerA.id }, data: { role: 'MANAGER', managerId: null } });
  await prisma.user.update({ where: { id: actors.managerB.id }, data: { role: 'MANAGER', managerId: null } });

  if (createdUsers.length > 0) {
    // `audit_logs` is append-only in the database, and the fixtures' rows point
    // at it, so teardown has to lift the trigger it is otherwise this suite's
    // job to respect. Nothing outside this `afterAll` may do this.
    await prisma.$executeRawUnsafe('ALTER TABLE "audit_logs" DISABLE TRIGGER "audit_logs_no_update_delete"');
    try {
      await prisma.auditLog.deleteMany({
        where: { OR: [{ actorUserId: { in: createdUsers } }, { targetUserId: { in: createdUsers } }] },
      });
      await prisma.user.updateMany({
        where: { managerId: { in: createdUsers } },
        data: { managerId: null },
      });
      await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
    } finally {
      await prisma.$executeRawUnsafe('ALTER TABLE "audit_logs" ENABLE TRIGGER "audit_logs_no_update_delete"');
    }
  }
  if (createdDepartments.length > 0) {
    await prisma.user.updateMany({
      where: { departmentId: { in: createdDepartments } },
      data: { departmentId: null },
    });
    await prisma.department.deleteMany({ where: { id: { in: createdDepartments } } });
  }
});

describe('who may administer', () => {
  it('refuses the whole admin surface to a recruit and a manager', async () => {
    const target = await makeUser();
    const department = await makeDepartment();
    const body = { full_name: 'Renamed' };

    const attempts = await Promise.all([
      createUser('recruitA', {
        email: 'x@onboarding.test',
        full_name: 'Xavier Stone',
        start_date: '2026-01-01',
      }),
      createUser('managerA', {
        email: 'y@onboarding.test',
        full_name: 'Yolanda Reed',
        start_date: '2026-01-01',
      }),
      patchUser('recruitA', target, body),
      patchUser('managerA', target, body),
      deactivate('managerA', target),
      reactivate('managerA', target),
      createDepartment('managerA', { name: 'Nope' }),
      patchDepartment('managerA', department, { name: 'Nope' }),
      deleteDepartment('managerA', department),
    ]);

    expect(attempts.map((attempt) => [attempt.status, errorCode(attempt.json)])).toEqual(
      attempts.map(() => [403, 'INSUFFICIENT_ROLE'])
    );
  });

  it('answers 401 to an anonymous administration attempt', async () => {
    const response = await call(usersPost as Handler, {
      method: 'POST',
      url: '/api/v1/users',
      body: { email: 'anon@onboarding.test', full_name: 'Anon', start_date: '2026-01-01' },
    });

    expect(response.status).toBe(401);
  });

  it('gives a manager the scoped summary without emails and an admin the directory with them', async () => {
    const asManager = await listUsers('managerA');
    const asAdmin = await listUsers('admin');

    const summaries = asManager.json.data as (UserSummary & { email?: string })[];
    expect(summaries.every((user) => user.email === undefined)).toBe(true);
    expect(summaries.some((user) => user.id === actors.managerB.id)).toBe(false);

    expect(adminUsers(asAdmin.json).length).toBeGreaterThan(summaries.length);
    expect(adminUsers(asAdmin.json).every((user) => user.email.includes('@'))).toBe(true);
  });

  it('filters the admin directory by role, activity and search term', async () => {
    const byRole = await listUsers('admin', '?role=MANAGER');
    expect(adminUsers(byRole.json).every((user) => user.role === 'MANAGER')).toBe(true);

    const bySearch = await listUsers('admin', '?q=marcus');
    expect(adminUsers(bySearch.json).map((user) => user.id)).toEqual([actors.managerA.id]);

    const inactive = await makeUser({ isActive: false });
    const byActivity = await listUsers('admin', '?is_active=false');
    expect(adminUsers(byActivity.json).map((user) => user.id)).toContain(inactive);
    expect(adminUsers(byActivity.json).every((user) => !user.is_active)).toBe(true);
  });
});

describe('creating a user', () => {
  it('creates the account and returns a working temporary password exactly once', async () => {
    const email = `m10-create-${crypto.randomUUID().slice(0, 8)}@onboarding.test`;
    const response = await createUser('admin', {
      email,
      full_name: 'New Recruit',
      role: 'RECRUIT',
      start_date: '2026-03-02',
      manager_id: actors.managerA.id,
    });

    expect(response.status).toBe(201);
    const payload = response.json.data as { user: AdminUserView; temporary_password: string };
    createdUsers.push(payload.user.id);

    expect(payload.temporary_password.length).toBeGreaterThanOrEqual(12);
    expect(payload.user.email).toBe(email);
    expect(payload.user.manager?.id).toBe(actors.managerA.id);

    const stored = await prisma.user.findUniqueOrThrow({
      where: { id: payload.user.id },
      select: { passwordHash: true },
    });
    expect(stored.passwordHash).not.toContain(payload.temporary_password);
    expect(await verifyPassword(payload.temporary_password, stored.passwordHash)).toBe(true);

    // The password is a credential, not an audit fact.
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'USER.CREATED', targetUserId: payload.user.id },
    });
    expect(audit).not.toBeNull();
    expect(JSON.stringify(audit?.after)).not.toContain(payload.temporary_password);
  });

  it('refuses a duplicate email, an invalid manager and an inactive department', async () => {
    const inactiveDepartment = await makeDepartment(false);

    const duplicate = await createUser('admin', {
      email: EMAILS.recruitA,
      full_name: 'Clone',
      start_date: '2026-03-02',
    });
    expect(duplicate.status).toBe(409);
    expect(errorCode(duplicate.json)).toBe('EMAIL_ALREADY_REGISTERED');

    const badManager = await createUser('admin', {
      email: `m10-bad-${crypto.randomUUID().slice(0, 8)}@onboarding.test`,
      full_name: 'Bad Manager',
      start_date: '2026-03-02',
      manager_id: actors.recruitA.id,
    });
    expect(badManager.status).toBe(422);
    expect(badManager.json.error?.details).toEqual([
      expect.objectContaining({ field: 'manager_id', code: 'INVALID_MANAGER' }),
    ]);

    const badDepartment = await createUser('admin', {
      email: `m10-dept-${crypto.randomUUID().slice(0, 8)}@onboarding.test`,
      full_name: 'Bad Department',
      start_date: '2026-03-02',
      department_id: inactiveDepartment,
    });
    expect(badDepartment.status).toBe(422);
    expect(badDepartment.json.error?.details).toEqual([expect.objectContaining({ field: 'department_id' })]);
  });

  it('refuses an unknown field rather than ignoring it', async () => {
    const response = await createUser('admin', {
      email: `m10-strict-${crypto.randomUUID().slice(0, 8)}@onboarding.test`,
      full_name: 'Strict',
      start_date: '2026-03-02',
      is_active: false,
      password: 'hunter2',
    });

    expect(response.status).toBe(422);
    expect(errorCode(response.json)).toBe('VALIDATION_ERROR');
  });
});

describe('reassignment and the reporting graph', () => {
  it('moves a recruit between managers, and the scope moves with them on the next request', async () => {
    const recruit = await makeUser({ managerId: actors.managerA.id });

    const beforeA = await listUsers('managerA');
    expect((beforeA.json.data as UserSummary[]).map((user) => user.id)).toContain(recruit);

    const patched = await patchUser('admin', recruit, { manager_id: actors.managerB.id });
    expect(patched.status).toBe(200);

    const [afterA, afterB] = await Promise.all([listUsers('managerA'), listUsers('managerB')]);
    expect((afterA.json.data as UserSummary[]).map((user) => user.id)).not.toContain(recruit);
    expect((afterB.json.data as UserSummary[]).map((user) => user.id)).toContain(recruit);

    // The old manager may no longer address them directly either.
    const denied = await getUser('managerA', recruit);
    expect(denied.status).toBe(404);

    const audit = await prisma.auditLog.findFirst({
      where: { action: 'USER.MANAGER_CHANGED', targetUserId: recruit },
      orderBy: { createdAt: 'desc' },
    });
    expect(audit?.after).toMatchObject({ manager_id: actors.managerB.id });
  });

  it('refuses a self-assignment, a deactivated manager and a reporting cycle', async () => {
    const manager = await makeUser({ role: 'MANAGER' });
    const middle = await makeUser({ role: 'MANAGER', managerId: manager });
    const dormant = await makeUser({ role: 'MANAGER', isActive: false });

    const attempts = await Promise.all([
      patchUser('admin', manager, { manager_id: manager }),
      patchUser('admin', middle, { manager_id: dormant }),
      patchUser('admin', manager, { manager_id: middle }),
    ]);

    for (const attempt of attempts) {
      expect(attempt.status).toBe(422);
      expect(attempt.json.error?.details).toEqual([
        expect.objectContaining({ field: 'manager_id', code: 'INVALID_MANAGER' }),
      ]);
    }

    const unchanged = await prisma.user.findUniqueOrThrow({
      where: { id: manager },
      select: { managerId: true },
    });
    expect(unchanged.managerId).toBeNull();
  });

  it('refuses to demote a manager who still has reports, and accepts the demotion with a destination', async () => {
    const manager = await makeUser({ role: 'MANAGER' });
    const recruit = await makeUser({ managerId: manager });

    const orphaning = await patchUser('admin', manager, { role: 'RECRUIT' });
    expect(orphaning.status).toBe(422);
    expect(errorCode(orphaning.json)).toBe('MANAGER_HAS_REPORTS');
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: manager }, select: { role: true } })).role
    ).toBe('MANAGER');

    const demoted = await patchUser('admin', manager, {
      role: 'RECRUIT',
      reassign_to: actors.managerB.id,
    });
    expect(demoted.status).toBe(200);
    expect(adminUser(demoted.json).role).toBe('RECRUIT');
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: recruit }, select: { managerId: true } })).managerId
    ).toBe(actors.managerB.id);

    const rows = await prisma.auditLog.findMany({
      where: { targetUserId: { in: [manager, recruit] } },
      select: { action: true },
    });
    expect(rows.map((row) => row.action)).toEqual(
      expect.arrayContaining(['USER.ROLE_CHANGED', 'USER.MANAGER_CHANGED'])
    );
  });

  it('promotes a manager with reports to admin without demanding a reassignment', async () => {
    const manager = await makeUser({ role: 'MANAGER' });
    const recruit = await makeUser({ managerId: manager });

    const promoted = await patchUser('admin', manager, { role: 'ADMIN' });
    expect(promoted.status).toBe(200);
    expect(adminUser(promoted.json).role).toBe('ADMIN');

    // The reporting line survives the promotion: an admin may hold reports.
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: recruit }, select: { managerId: true } })).managerId
    ).toBe(manager);

    // Put the fixture back so the seeded admin is once more the only one and
    // the last-admin protections below still describe the real state.
    await prisma.user.update({ where: { id: manager }, data: { role: 'MANAGER' } });
  });

  it('validates reassign_to even when the change is not a demotion', async () => {
    const manager = await makeUser({ role: 'MANAGER' });
    const recruit = await makeUser({ managerId: manager });
    const notAManager = await makeUser({ role: 'RECRUIT' });
    const deactivated = await makeUser({ role: 'MANAGER' });
    await prisma.user.update({ where: { id: deactivated }, data: { isActive: false } });

    const attempts = await Promise.all([
      patchUser('admin', manager, { full_name: 'Renamed Manager', reassign_to: notAManager }),
      patchUser('admin', manager, { full_name: 'Renamed Manager', reassign_to: deactivated }),
      patchUser('admin', manager, { full_name: 'Renamed Manager', reassign_to: manager }),
    ]);

    for (const attempt of attempts) {
      expect(attempt.status).toBe(422);
      expect(attempt.json.error?.details).toEqual([expect.objectContaining({ code: 'INVALID_MANAGER' })]);
    }

    const untouched = await prisma.user.findUniqueOrThrow({
      where: { id: recruit },
      select: { managerId: true },
    });
    expect(untouched.managerId).toBe(manager);
  });
});

describe('the last admin', () => {
  it('cannot be demoted or deactivated while they are the only one', async () => {
    const demotion = await patchUser('admin', actors.admin.id, { role: 'MANAGER' });
    expect(demotion.status).toBe(422);
    expect(errorCode(demotion.json)).toBe('LAST_ADMIN');

    const removal = await deactivate('admin', actors.admin.id);
    expect(removal.status).toBe(422);
    expect(errorCode(removal.json)).toBe('LAST_ADMIN');

    const stillThere = await prisma.user.findUniqueOrThrow({
      where: { id: actors.admin.id },
      select: { role: true, isActive: true },
    });
    expect(stillThere).toEqual({ role: 'ADMIN', isActive: true });
  });

  it('may be demoted once a second active admin exists', async () => {
    const second = await makeUser({ role: 'ADMIN' });

    const demotion = await patchUser('admin', second, { role: 'RECRUIT' });
    expect(demotion.status).toBe(200);

    // …and the original is protected again as soon as they are alone.
    const blocked = await patchUser('admin', actors.admin.id, { role: 'MANAGER' });
    expect(errorCode(blocked.json)).toBe('LAST_ADMIN');
  });
});

describe('deactivation', () => {
  it('is soft and reversible and leaves the entries in place', async () => {
    const recruit = await makeUser({ managerId: actors.managerA.id });
    const task = await prisma.taskEntry.create({
      data: {
        ownerId: recruit,
        updatedById: recruit,
        entryDate: new Date('2026-03-01T00:00:00Z'),
        title: 'Survives deactivation',
        category: 'ORIENTATION',
        status: 'DONE',
        priority: 'LOW',
        completedAt: new Date('2026-03-01T09:00:00Z'),
      },
      select: { id: true },
    });

    const off = await deactivate('admin', recruit, { reason: 'left the company' });
    expect(off.status).toBe(200);
    expect(adminUser(off.json).is_active).toBe(false);

    const stored = await prisma.taskEntry.findUnique({ where: { id: task.id }, select: { id: true } });
    expect(stored).not.toBeNull();

    // A deactivated report stays in their manager's scope: the history is
    // still reportable (D5).
    const roster = await listUsers('managerA');
    expect((roster.json.data as UserSummary[]).map((user) => user.id)).toContain(recruit);

    const on = await reactivate('admin', recruit);
    expect(adminUser(on.json).is_active).toBe(true);

    const actions = await prisma.auditLog.findMany({
      where: { targetUserId: recruit },
      select: { action: true },
    });
    expect(actions.map((row) => row.action)).toEqual(
      expect.arrayContaining(['USER.DEACTIVATED', 'USER.REACTIVATED'])
    );

    await prisma.taskEntry.delete({ where: { id: task.id } });
  });

  it('rejects a form-encoded reactivation, which has no body to type-check', async () => {
    const recruit = await makeUser();
    const request = new Request(`http://localhost/api/v1/users/${recruit}/reactivate`, {
      method: 'POST',
      headers: { cookie: actors.admin.cookie, 'content-type': 'application/x-www-form-urlencoded' },
    });

    const response = await (reactivatePost as Handler)(request, {
      params: Promise.resolve({ id: recruit }),
    });

    expect(response.status).toBe(415);
  });
});

describe('departments', () => {
  it('shows an anonymous caller the active list and an admin the management view', async () => {
    const inactive = await makeDepartment(false);

    const anonymous = await listDepartments();
    expect(departments(anonymous.json).some((department) => department.id === inactive)).toBe(false);
    expect(departments(anonymous.json)[0].member_count).toBeUndefined();

    const admin = await listDepartments('admin', '?include_inactive=true');
    const row = departments(admin.json).find((department) => department.id === inactive);
    expect(row).toMatchObject({ is_active: false, member_count: 0 });

    const activeOnly = await listDepartments('admin');
    expect(departments(activeOnly.json).some((department) => department.id === inactive)).toBe(false);
  });

  it('creates, renames and deactivates, and a deactivated department takes no new members', async () => {
    const created = await createDepartment('admin', { name: `M10 Ops ${Date.now()}` });
    expect(created.status).toBe(201);
    const department = created.json.data as DepartmentView;
    createdDepartments.push(department.id);

    const renamed = await patchDepartment('admin', department.id, { name: `${department.name} EU` });
    expect((renamed.json.data as DepartmentView).name).toBe(`${department.name} EU`);

    const member = await makeUser();
    expect((await patchUser('admin', member, { department_id: department.id })).status).toBe(200);

    const deactivated = await patchDepartment('admin', department.id, { is_active: false });
    expect((deactivated.json.data as DepartmentView).is_active).toBe(false);

    // Existing membership survives…
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: member }, select: { departmentId: true } }))
        .departmentId
    ).toBe(department.id);

    // …but nobody new may be moved in.
    const newcomer = await makeUser();
    const refused = await patchUser('admin', newcomer, { department_id: department.id });
    expect(refused.status).toBe(422);

    const actions = await prisma.auditLog.findMany({
      where: { entityId: department.id },
      select: { action: true },
    });
    expect(actions.map((row) => row.action)).toEqual(
      expect.arrayContaining(['DEPARTMENT.CREATED', 'DEPARTMENT.UPDATED', 'DEPARTMENT.DEACTIVATED'])
    );
  });

  it('deletes an empty department and refuses one with members', async () => {
    const empty = await makeDepartment();
    const populated = await makeDepartment();
    const member = await makeUser();
    await patchUser('admin', member, { department_id: populated });

    const inUse = await deleteDepartment('admin', populated);
    expect(inUse.status).toBe(409);
    expect(errorCode(inUse.json)).toBe('DEPARTMENT_IN_USE');
    expect(await prisma.department.findUnique({ where: { id: populated } })).not.toBeNull();

    const deleted = await deleteDepartment('admin', empty);
    expect(deleted.status).toBe(204);
    expect(await prisma.department.findUnique({ where: { id: empty } })).toBeNull();
  });

  it('answers 404 for an unknown department rather than confirming the id space', async () => {
    const missing = crypto.randomUUID();

    const patched = await patchDepartment('admin', missing, { name: 'Ghost' });
    expect(patched.status).toBe(404);
    expect((await deleteDepartment('admin', missing)).status).toBe(404);
  });
});
