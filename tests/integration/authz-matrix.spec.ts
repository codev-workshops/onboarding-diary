/**
 * The authorization matrix (spec §11.8, AZ-M1…M10 and AZ-R1…R6).
 *
 * These run against a migrated and seeded Postgres, because the rules being
 * asserted are SQL predicates: a test that stubs the repository would prove the
 * mock filters correctly and nothing about the application. The endpoints
 * themselves arrive in M4–M9; the guards and scoped repositories they are
 * required to use exist now, and are what is exercised here.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  assertCanCreateEntry,
  assertCanDeleteEntry,
  assertCanUpdateEntry,
  assertRole,
  resolveReportTargets,
} from '@/src/modules/authz/policy';
import {
  readableUserIds,
  resolveOwnerFilter,
  type Actor,
  type ReadableUsers,
} from '@/src/modules/authz/scope';
import {
  feedbackRepository,
  issueRepository,
  noteRepository,
  taskRepository,
} from '@/src/modules/entries/repositories';
import { getVisibleUser, listVisibleUsers } from '@/src/modules/users/service';
import { prisma } from '@/src/shared/db/prisma';
import { AppError } from '@/src/shared/http/errors';

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

const actors = {} as Record<Key, Actor>;

const idsOf = (scope: ReadableUsers): string[] => (scope.kind === 'IDS' ? scope.ids : []);

/** Asserts the code *and* that the message carries no identifiers back out. */
async function expectDenied(promise: Promise<unknown>, code: string, status: number): Promise<AppError> {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught
  );
  expect(error, `expected ${code}`).toBeInstanceOf(AppError);
  const appError = error as AppError;
  expect(appError.code).toBe(code);
  expect(appError.status).toBe(status);
  expect(appError.message).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/i);
  return appError;
}

beforeAll(async () => {
  const users = await prisma.user.findMany({
    where: { email: { in: Object.values(EMAILS) } },
    select: { id: true, email: true, role: true },
  });

  for (const [key, email] of Object.entries(EMAILS) as [Key, string][]) {
    const user = users.find((candidate) => candidate.email === email);
    if (!user) throw new Error(`Seed fixture missing: ${email}. Run npm run db:seed.`);
    actors[key] = { id: user.id, role: user.role };
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('readable_user_ids', () => {
  it('gives an admin the unconstrained scope rather than a list of everyone', async () => {
    await expect(readableUserIds(actors.admin)).resolves.toEqual({ kind: 'ALL' });
  });

  it('gives a manager themselves plus their direct reports only', async () => {
    const scope = await readableUserIds(actors.managerA);
    expect(scope.kind).toBe('IDS');
    const ids = idsOf(scope);

    expect(ids).toContain(actors.managerA.id);
    expect(ids).toContain(actors.recruitA.id);
    expect(ids).not.toContain(actors.recruitB.id);
    expect(ids).not.toContain(actors.managerB.id);
    expect(ids).not.toContain(actors.unassigned.id);
    expect(ids).not.toContain(actors.admin.id);
  });

  it('does not make a manager visible to their peer, so scope cannot become transitive', async () => {
    const ids = idsOf(await readableUserIds(actors.managerB));
    expect(ids).not.toContain(actors.managerA.id);
    expect(ids).not.toContain(actors.recruitA.id);
  });

  it('gives a recruit exactly themselves', async () => {
    await expect(readableUserIds(actors.recruitA)).resolves.toEqual({
      kind: 'IDS',
      ids: [actors.recruitA.id],
    });
  });
});

describe('AZ-M1 — manager list scope', () => {
  it('returns only in-scope owners across every entry type', async () => {
    const inScope = idsOf(await readableUserIds(actors.managerA));

    for (const repository of [taskRepository, issueRepository, feedbackRepository]) {
      const rows = await repository.list(actors.managerA);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows as { ownerId: string }[]) {
        expect(inScope).toContain(row.ownerId);
      }
    }
  });

  it('never surfaces another manager’s recruit', async () => {
    const rows = (await taskRepository.list(actors.managerA)) as { ownerId: string }[];
    expect(rows.some((row) => row.ownerId === actors.recruitB.id)).toBe(false);
    expect(rows.some((row) => row.ownerId === actors.unassigned.id)).toBe(false);
  });
});

describe('AZ-M2 — explicit out-of-scope owner_id', () => {
  it('fails the request with 403 OUT_OF_SCOPE and leaks no rows', async () => {
    await expectDenied(resolveOwnerFilter(actors.managerA, actors.recruitB.id), 'OUT_OF_SCOPE', 403);
    await expectDenied(
      taskRepository.list(actors.managerA, { ownerId: actors.recruitB.id }),
      'OUT_OF_SCOPE',
      403
    );
  });

  it('still honours an in-scope owner_id as a plain filter', async () => {
    const rows = (await taskRepository.list(actors.managerA, { ownerId: actors.recruitA.id })) as {
      ownerId: string;
    }[];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.ownerId === actors.recruitA.id)).toBe(true);
  });
});

describe('AZ-M3 — addressing an invisible entry by id', () => {
  it('is a 404, not a 403, so existence is not disclosed', async () => {
    const foreign = await prisma.taskEntry.findFirstOrThrow({ where: { ownerId: actors.recruitB.id } });

    await expect(taskRepository.findById(actors.managerA, foreign.id)).resolves.toBeNull();
    await expectDenied(taskRepository.findByIdOrThrow(actors.managerA, foreign.id), 'NOT_FOUND', 404);
  });
});

describe('AZ-M4 — notes are owner-private', () => {
  it('hides an in-scope recruit’s note from their own manager, as a 404', async () => {
    const note = await prisma.noteEntry.findFirstOrThrow({ where: { ownerId: actors.recruitA.id } });

    await expect(noteRepository.findById(actors.managerA, note.id)).resolves.toBeNull();
    await expectDenied(noteRepository.findByIdOrThrow(actors.managerA, note.id), 'NOT_FOUND', 404);
  });

  it('restricts a manager’s note list to their own notes even when they ask for a report’s', async () => {
    const rows = (await noteRepository.list(actors.managerA)) as { ownerId: string }[];
    expect(rows.every((row) => row.ownerId === actors.managerA.id)).toBe(true);

    await expectDenied(
      noteRepository.list(actors.managerA, { ownerId: actors.recruitA.id }),
      'NOT_FOUND',
      404
    );
  });

  it('lets an admin read them, which is the privileged path', async () => {
    const note = await prisma.noteEntry.findFirstOrThrow({ where: { ownerId: actors.recruitA.id } });
    await expect(noteRepository.findById(actors.admin, note.id)).resolves.not.toBeNull();
  });
});

describe('ADMIN_ONLY feedback', () => {
  let feedbackId = '';

  beforeAll(async () => {
    const created = await prisma.feedbackEntry.create({
      data: {
        ownerId: actors.recruitA.id,
        updatedById: actors.recruitA.id,
        entryDate: new Date('2026-01-05'),
        subject: 'Confidential onboarding feedback',
        type: 'CONCERN',
        details: 'Visible to the author and admins only.',
        visibility: 'ADMIN_ONLY',
      },
    });
    feedbackId = created.id;
  });

  afterAll(async () => {
    await prisma.feedbackEntry.delete({ where: { id: feedbackId } });
  });

  it('is withheld from the owner’s manager but readable by its author and admins', async () => {
    await expect(feedbackRepository.findById(actors.managerA, feedbackId)).resolves.toBeNull();
    await expect(feedbackRepository.findById(actors.recruitA, feedbackId)).resolves.not.toBeNull();
    await expect(feedbackRepository.findById(actors.admin, feedbackId)).resolves.not.toBeNull();
  });
});

describe('AZ-M5 — manager issue field allow-list', () => {
  it('permits status and resolution_notes on an in-scope issue', async () => {
    const issue = await prisma.issueEntry.findFirstOrThrow({ where: { ownerId: actors.recruitA.id } });
    await expect(
      assertCanUpdateEntry(actors.managerA, 'ISSUE', issue, ['status', 'resolutionNotes'])
    ).resolves.toBeUndefined();
  });

  it('rejects the whole request when any other field is present', async () => {
    const issue = await prisma.issueEntry.findFirstOrThrow({ where: { ownerId: actors.recruitA.id } });
    const error = await expectDenied(
      assertCanUpdateEntry(actors.managerA, 'ISSUE', issue, ['status', 'title', 'severity']),
      'FIELD_NOT_PERMITTED',
      403
    );
    expect(error.details.map((detail) => detail.field)).toEqual(['title', 'severity']);
  });

  it('does not extend the allow-list to other entry types', async () => {
    const task = await prisma.taskEntry.findFirstOrThrow({ where: { ownerId: actors.recruitA.id } });
    await expectDenied(
      assertCanUpdateEntry(actors.managerA, 'TASK', task, ['status']),
      'FIELD_NOT_PERMITTED',
      403
    );
  });

  it('is a 404 when the issue is out of scope, before any field check runs', async () => {
    const issue = await prisma.issueEntry.findFirstOrThrow({ where: { ownerId: actors.recruitB.id } });
    await expectDenied(assertCanUpdateEntry(actors.managerA, 'ISSUE', issue, ['status']), 'NOT_FOUND', 404);
  });
});

describe('AZ-M6 / AZ-M7 / AZ-R6 — report scope', () => {
  it('defaults a manager to their direct reports', async () => {
    const targets = await resolveReportTargets(actors.managerA, {
      scopeType: 'USERS',
      sections: ['TASKS', 'ISSUES'],
    });
    expect(targets).toContain(actors.recruitA.id);
    expect(targets).not.toContain(actors.recruitB.id);
    expect(targets).not.toContain(actors.managerA.id);
  });

  it('fails the whole report rather than silently narrowing it', async () => {
    const error = await expectDenied(
      resolveReportTargets(actors.managerA, {
        scopeType: 'USERS',
        userIds: [actors.recruitA.id, actors.recruitB.id],
        sections: ['TASKS'],
      }),
      'OUT_OF_SCOPE',
      403
    );
    expect(error.details.map((detail) => detail.field)).toEqual(['user_ids[1]']);
  });

  it('refuses an org-wide report to a manager', async () => {
    await expectDenied(
      resolveReportTargets(actors.managerA, { scopeType: 'ORG', sections: ['TASKS'] }),
      'INSUFFICIENT_ROLE',
      403
    );
  });

  it('refuses a notes section on anyone else’s report', async () => {
    await expectDenied(
      resolveReportTargets(actors.managerA, { scopeType: 'USERS', sections: ['NOTES'] }),
      'SECTION_NOT_PERMITTED',
      403
    );
    await expect(
      resolveReportTargets(actors.managerA, { scopeType: 'SELF', sections: ['NOTES'] })
    ).resolves.toEqual([actors.managerA.id]);
  });

  it('limits a recruit to a report about themselves', async () => {
    await expect(
      resolveReportTargets(actors.recruitA, { scopeType: 'SELF', sections: ['TASKS'] })
    ).resolves.toEqual([actors.recruitA.id]);

    for (const scopeType of ['USER', 'USERS', 'ORG'] as const) {
      await expectDenied(
        resolveReportTargets(actors.recruitA, {
          scopeType,
          userIds: [actors.recruitA2.id],
          sections: ['TASKS'],
        }),
        'INSUFFICIENT_ROLE',
        403
      );
    }
  });
});

describe('AZ-M8 — scope is evaluated live', () => {
  it('follows a reassignment on the very next request, with no caching', async () => {
    const before = await taskRepository.list(actors.managerB, { ownerId: undefined });
    expect((before as { ownerId: string }[]).some((row) => row.ownerId === actors.recruitA.id)).toBe(false);

    await prisma.user.update({
      where: { id: actors.recruitA.id },
      data: { managerId: actors.managerB.id },
    });

    try {
      expect(idsOf(await readableUserIds(actors.managerA))).not.toContain(actors.recruitA.id);
      expect(idsOf(await readableUserIds(actors.managerB))).toContain(actors.recruitA.id);

      await expectDenied(
        taskRepository.list(actors.managerA, { ownerId: actors.recruitA.id }),
        'OUT_OF_SCOPE',
        403
      );
      await expect(
        taskRepository.list(actors.managerB, { ownerId: actors.recruitA.id })
      ).resolves.not.toHaveLength(0);
    } finally {
      await prisma.user.update({
        where: { id: actors.recruitA.id },
        data: { managerId: actors.managerA.id },
      });
    }
  });
});

describe('AZ-M9 / AZ-R4 — directory reads', () => {
  it('returns a manager their own reports and never anyone’s email address', async () => {
    const users = await listVisibleUsers(actors.managerA);
    const ids = users.map((user) => user.id);

    expect(ids).toContain(actors.managerA.id);
    expect(ids).toContain(actors.recruitA.id);
    expect(ids).not.toContain(actors.recruitB.id);
    expect(users.every((user) => !('email' in user))).toBe(true);
  });

  it('is a 404 when a manager addresses a user outside their scope', async () => {
    await expectDenied(getVisibleUser(actors.managerA, actors.recruitB.id), 'NOT_FOUND', 404);
    await expect(getVisibleUser(actors.admin, actors.recruitB.id)).resolves.toMatchObject({
      id: actors.recruitB.id,
    });
  });

  it('refuses a recruit the directory entirely', async () => {
    await expectDenied(listVisibleUsers(actors.recruitA), 'INSUFFICIENT_ROLE', 403);
  });
});

describe('AZ-M10 — managers do not author or remove other people’s entries', () => {
  it('refuses creation on behalf of an in-scope recruit', async () => {
    await expectDenied(assertCanCreateEntry(actors.managerA, actors.recruitA.id), 'INSUFFICIENT_ROLE', 403);
    await expect(assertCanCreateEntry(actors.managerA, actors.managerA.id)).resolves.toBeUndefined();
    await expect(assertCanCreateEntry(actors.admin, actors.recruitA.id)).resolves.toBeUndefined();
  });

  it('refuses deletion of an in-scope recruit’s entry', async () => {
    const task = await prisma.taskEntry.findFirstOrThrow({ where: { ownerId: actors.recruitA.id } });
    await expectDenied(assertCanDeleteEntry(actors.managerA, 'TASK', task), 'INSUFFICIENT_ROLE', 403);
    await expect(assertCanDeleteEntry(actors.recruitA, 'TASK', task)).resolves.toBeUndefined();
    await expect(assertCanDeleteEntry(actors.admin, 'TASK', task)).resolves.toBeUndefined();
  });
});

describe('AZ-R1 / AZ-R2 / AZ-R3 — recruits are hard-filtered to themselves', () => {
  it('ignores nothing and rejects an explicit foreign owner_id', async () => {
    await expectDenied(resolveOwnerFilter(actors.recruitA, actors.recruitA2.id), 'OUT_OF_SCOPE', 403);
  });

  it('lists only their own entries by default', async () => {
    for (const repository of [taskRepository, issueRepository, feedbackRepository, noteRepository]) {
      const rows = (await repository.list(actors.recruitA)) as { ownerId: string }[];
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((row) => row.ownerId === actors.recruitA.id)).toBe(true);
    }
  });

  it('cannot fetch a peer’s entry by id', async () => {
    const foreign = await prisma.taskEntry.findFirstOrThrow({ where: { ownerId: actors.recruitA2.id } });
    await expect(taskRepository.findById(actors.recruitA, foreign.id)).resolves.toBeNull();
  });

  it('cannot reach an admin-only capability', () => {
    expect(() => assertRole(actors.recruitA, ['ADMIN'])).toThrowError(AppError);
  });
});

describe('soft-deleted entries', () => {
  it('are excluded from every scoped read, including for an admin', async () => {
    const created = await prisma.taskEntry.create({
      data: {
        ownerId: actors.recruitA.id,
        updatedById: actors.recruitA.id,
        entryDate: new Date('2026-01-06'),
        title: 'Soft-deleted fixture',
        deletedAt: new Date(),
      },
    });

    try {
      await expect(taskRepository.findById(actors.recruitA, created.id)).resolves.toBeNull();
      await expect(taskRepository.findById(actors.admin, created.id)).resolves.toBeNull();
    } finally {
      await prisma.taskEntry.delete({ where: { id: created.id } });
    }
  });
});
