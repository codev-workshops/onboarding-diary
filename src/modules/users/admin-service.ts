import { Prisma, type UserRole } from '@prisma/client';
import type { Prisma as PrismaTypes } from '@prisma/client';

import { recordAudit } from '@/src/modules/audit/service';
import { hashPassword } from '@/src/modules/auth/password';
import { notFound } from '@/src/modules/authz/errors';
import { assertRole } from '@/src/modules/authz/policy';
import type { Actor } from '@/src/modules/authz/scope';
import { adminUserSelect, toAdminUser, type AdminUserView } from '@/src/modules/users/dto';
import type { AdminUserListQuery, CreateUserInput, UpdateUserInput } from '@/src/modules/users/admin-schemas';
import { prisma } from '@/src/shared/db/prisma';
import { AppError } from '@/src/shared/http/errors';

export type CreatedUser = { user: AdminUserView; temporary_password: string };

/** Admin directory read: every user, with the filters of §12.4. */
export async function listUsersForAdmin(actor: Actor, query: AdminUserListQuery): Promise<AdminUserView[]> {
  assertRole(actor, ['ADMIN']);

  const users = await prisma.user.findMany({
    where: {
      role: query.role,
      departmentId: query.department_id,
      managerId: query.manager_id,
      isActive: query.is_active,
      ...(query.q
        ? {
            OR: [
              { fullName: { contains: query.q, mode: 'insensitive' } },
              { email: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: [{ fullName: 'asc' }],
    select: adminUserSelect,
  });

  return users.map(toAdminUser);
}

export async function getUserForAdmin(actor: Actor, userId: string): Promise<AdminUserView> {
  assertRole(actor, ['ADMIN']);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: adminUserSelect });
  if (!user) throw notFound();

  return toAdminUser(user);
}

/**
 * US-70. The generated password is returned exactly once, in the creation
 * response, and never stored in plaintext or written to the audit row — the
 * admin has to hand it over out of band. The account is created with
 * `must_change_password`, so the first sign-in cannot go anywhere but the
 * change-password screen.
 */
export async function createUser(actor: Actor, input: CreateUserInput): Promise<CreatedUser> {
  assertRole(actor, ['ADMIN']);

  await assertAssignableDepartment(input.department_id ?? null, null);
  await assertAssignableManager(input.manager_id ?? null, null);

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: input.email,
          passwordHash,
          fullName: input.full_name,
          role: input.role,
          departmentId: input.department_id ?? null,
          startDate: new Date(`${input.start_date}T00:00:00Z`),
          managerId: input.manager_id ?? null,
          mustChangePassword: true,
        },
        select: adminUserSelect,
      });

      await recordAudit(
        {
          action: 'USER.CREATED',
          entityType: 'USER',
          entityId: created.id,
          targetUserId: created.id,
          after: {
            email: created.email,
            role: created.role,
            department_id: created.department?.id ?? null,
            manager_id: created.managerId,
          },
        },
        tx
      );

      return created;
    });

    return { user: toAdminUser(user), temporary_password: temporaryPassword };
  } catch (error) {
    throw translateUniqueEmail(error);
  }
}

/**
 * US-71/US-74. Every rule that can refuse the change is evaluated before
 * anything is written, and the write plus its audit rows share one transaction:
 * a reporting line that moved without leaving a record would defeat the point
 * of recording it (§22.3).
 */
export async function updateUser(
  actor: Actor,
  userId: string,
  input: UpdateUserInput
): Promise<AdminUserView> {
  assertRole(actor, ['ADMIN']);

  const before = await prisma.user.findUnique({
    where: { id: userId },
    select: { ...adminUserSelect, departmentId: true },
  });
  if (!before) throw notFound();

  const nextRole = input.role ?? before.role;
  const nextActive = input.is_active ?? before.isActive;

  if (input.department_id !== undefined) {
    await assertAssignableDepartment(input.department_id, before.departmentId);
  }
  if (input.manager_id !== undefined) {
    await assertAssignableManager(input.manager_id, userId);
  }
  if (nextRole !== 'MANAGER' && before.role === 'MANAGER') {
    await assertManagerCanBeDemoted(userId, before._count.recruits, input.reassign_to ?? null);
  }
  if (before.role === 'ADMIN' && before.isActive && (nextRole !== 'ADMIN' || !nextActive)) {
    await assertNotLastAdmin(userId);
  }

  try {
    const after = await prisma.$transaction(async (tx) => {
      if (input.reassign_to !== undefined && input.reassign_to !== null && before.role === 'MANAGER') {
        await reassignReports(tx, userId, input.reassign_to);
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          email: input.email,
          fullName: input.full_name,
          role: input.role,
          departmentId: input.department_id,
          startDate: input.start_date ? new Date(`${input.start_date}T00:00:00Z`) : undefined,
          managerId: input.manager_id,
          isActive: input.is_active,
        },
        select: adminUserSelect,
      });

      await recordChangeAudits(tx, before, updated);

      return updated;
    });

    return toAdminUser(after);
  } catch (error) {
    throw translateUniqueEmail(error);
  }
}

/**
 * Admin-initiated reset (§12.4). The same one-time hand-over as creation, and
 * the account is put back into the forced-change state so a password the admin
 * has seen cannot stay in use.
 */
export async function resetUserPassword(actor: Actor, userId: string): Promise<CreatedUser> {
  assertRole(actor, ['ADMIN']);

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) throw notFound();

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(temporaryPassword);

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { passwordHash, mustChangePassword: true },
      select: adminUserSelect,
    });

    await recordAudit(
      {
        action: 'AUTH.PASSWORD_RESET',
        entityType: 'USER',
        entityId: userId,
        targetUserId: userId,
        after: { must_change_password: true },
      },
      tx
    );

    return updated;
  });

  return { user: toAdminUser(user), temporary_password: temporaryPassword };
}

/**
 * US-72: deactivation is soft and reversible, and the entries stay reportable —
 * `is_active` is the whole lifecycle, there is no delete path to reach.
 */
export async function setUserActive(
  actor: Actor,
  userId: string,
  isActive: boolean,
  reason?: string
): Promise<AdminUserView> {
  assertRole(actor, ['ADMIN']);

  const before = await prisma.user.findUnique({ where: { id: userId }, select: adminUserSelect });
  if (!before) throw notFound();
  if (before.isActive === isActive) return toAdminUser(before);
  if (!isActive && before.role === 'ADMIN') await assertNotLastAdmin(userId);

  const after = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { isActive },
      select: adminUserSelect,
    });

    await recordAudit(
      {
        action: isActive ? 'USER.REACTIVATED' : 'USER.DEACTIVATED',
        entityType: 'USER',
        entityId: userId,
        targetUserId: userId,
        before: { is_active: before.isActive },
        after: { is_active: isActive, ...(reason ? { reason } : {}) },
      },
      tx
    );

    return updated;
  });

  return toAdminUser(after);
}

/** FR-AD3: the organisation must never be left without a way in. */
async function assertNotLastAdmin(userId: string): Promise<void> {
  const others = await prisma.user.count({
    where: { role: 'ADMIN', isActive: true, id: { not: userId } },
  });
  if (others === 0) {
    throw new AppError('LAST_ADMIN', 'This is the last active admin; promote another admin first.', [
      { field: 'role', code: 'LAST_ADMIN' },
    ]);
  }
}

/**
 * FR-AD4 and FR-AD5. A manager must be a manager (or an admin) and active, no
 * user may manage themselves, and the chain must stay acyclic — a cycle would
 * make `readable_user_ids` describe a loop rather than a hierarchy.
 */
async function assertAssignableManager(managerId: string | null, userId: string | null): Promise<void> {
  if (managerId === null) return;

  if (managerId === userId) throw invalidManager('A user cannot be their own manager.');

  const manager = await prisma.user.findUnique({
    where: { id: managerId },
    select: { id: true, role: true, isActive: true, managerId: true },
  });
  if (!manager) throw invalidManager('Choose a manager from the list.');
  if (manager.role === 'RECRUIT') throw invalidManager('That user is not a manager.');
  if (!manager.isActive) throw invalidManager('That manager is deactivated.');

  if (userId !== null && (await isDescendantOf(managerId, userId))) {
    throw invalidManager('That assignment would create a reporting cycle.');
  }
}

/** Walks up from `startId`; true if `ancestorId` reports (transitively) to it. */
async function isDescendantOf(startId: string, ancestorId: string): Promise<boolean> {
  const seen = new Set<string>();
  let current: string | null = startId;

  while (current !== null && !seen.has(current)) {
    if (current === ancestorId) return true;
    seen.add(current);
    const parent: { managerId: string | null } | null = await prisma.user.findUnique({
      where: { id: current },
      select: { managerId: true },
    });
    current = parent?.managerId ?? null;
  }

  return false;
}

/** FR-AD6: a demotion may not orphan direct reports without saying where they go. */
async function assertManagerCanBeDemoted(
  userId: string,
  reportCount: number,
  reassignTo: string | null
): Promise<void> {
  if (reportCount === 0) return;

  if (reassignTo === null) {
    throw new AppError(
      'MANAGER_HAS_REPORTS',
      `This manager still has ${reportCount} direct report${reportCount === 1 ? '' : 's'}. Supply reassign_to.`,
      [{ field: 'reassign_to', code: 'MANAGER_HAS_REPORTS', message: String(reportCount) }]
    );
  }

  if (reassignTo === userId) throw invalidManager('Reassign the reports to a different manager.');
  await assertAssignableManager(reassignTo, null);
}

async function reassignReports(
  tx: PrismaTypes.TransactionClient,
  fromId: string,
  toId: string
): Promise<void> {
  const moved = await tx.user.findMany({ where: { managerId: fromId }, select: { id: true } });
  if (moved.length === 0) return;

  await tx.user.updateMany({ where: { managerId: fromId }, data: { managerId: toId } });

  // One row per moved recruit rather than one summary row: the question this
  // table answers is "who could suddenly read whose diary", and that is a
  // per-user fact (AZ-M8).
  for (const user of moved) {
    await recordAudit(
      {
        action: 'USER.MANAGER_CHANGED',
        entityType: 'USER',
        entityId: user.id,
        targetUserId: user.id,
        before: { manager_id: fromId },
        after: { manager_id: toId },
      },
      tx
    );
  }
}

type AuditableUser = {
  id: string;
  email: string;
  role: UserRole;
  managerId: string | null;
  isActive: boolean;
  fullName: string;
  department: { id: string; name: string } | null;
};

/**
 * Role and manager changes get their own actions because they change who can
 * read whose diary; everything else is one `USER.UPDATED` diff. Nothing is
 * written when nothing changed.
 */
async function recordChangeAudits(
  tx: PrismaTypes.TransactionClient,
  before: AuditableUser,
  after: AuditableUser
): Promise<void> {
  if (before.role !== after.role) {
    await recordAudit(
      {
        action: 'USER.ROLE_CHANGED',
        entityType: 'USER',
        entityId: after.id,
        targetUserId: after.id,
        before: { role: before.role },
        after: { role: after.role },
      },
      tx
    );
  }

  if (before.managerId !== after.managerId) {
    await recordAudit(
      {
        action: 'USER.MANAGER_CHANGED',
        entityType: 'USER',
        entityId: after.id,
        targetUserId: after.id,
        before: { manager_id: before.managerId },
        after: { manager_id: after.managerId },
      },
      tx
    );
  }

  if (before.isActive !== after.isActive) {
    await recordAudit(
      {
        action: after.isActive ? 'USER.REACTIVATED' : 'USER.DEACTIVATED',
        entityType: 'USER',
        entityId: after.id,
        targetUserId: after.id,
        before: { is_active: before.isActive },
        after: { is_active: after.isActive },
      },
      tx
    );
  }

  const changed: Record<string, unknown> = {};
  if (before.email !== after.email) changed.email = after.email;
  if (before.fullName !== after.fullName) changed.full_name = after.fullName;
  if ((before.department?.id ?? null) !== (after.department?.id ?? null)) {
    changed.department_id = after.department?.id ?? null;
  }

  if (Object.keys(changed).length > 0) {
    await recordAudit(
      {
        action: 'USER.UPDATED',
        entityType: 'USER',
        entityId: after.id,
        targetUserId: after.id,
        before: {
          email: before.email,
          full_name: before.fullName,
          department_id: before.department?.id ?? null,
        },
        after: changed,
      },
      tx
    );
  }
}

/** US-73: a deactivated department keeps its members but takes no new ones. */
export async function assertAssignableDepartment(
  departmentId: string | null,
  currentId: string | null
): Promise<void> {
  if (departmentId === null || departmentId === currentId) return;

  const department = await prisma.department.findFirst({
    where: { id: departmentId, isActive: true },
    select: { id: true },
  });
  if (!department) {
    throw new AppError('VALIDATION_ERROR', 'The request contains invalid fields.', [
      { field: 'department_id', code: 'NOT_FOUND', message: 'Choose an active department from the list.' },
    ]);
  }
}

function invalidManager(message: string): AppError {
  return new AppError('VALIDATION_ERROR', 'The request contains invalid fields.', [
    { field: 'manager_id', code: 'INVALID_MANAGER', message },
  ]);
}

function translateUniqueEmail(error: unknown): unknown {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return new AppError('EMAIL_ALREADY_REGISTERED', 'An account with this email already exists.');
  }
  return error;
}

const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

/**
 * 16 characters from `crypto.getRandomValues` — never `Math.random`, which is
 * predictable enough to guess a colleague's initial password from a handful of
 * samples. The alphabet drops the glyphs that are misread when a password is
 * dictated over a desk.
 */
function generateTemporaryPassword(): string {
  const bytes = crypto.getRandomValues(new Uint32Array(16));
  const body = Array.from(bytes, (value) => PASSWORD_ALPHABET[value % PASSWORD_ALPHABET.length]).join('');

  // The complexity rules of §9.1 apply to the generated password too, and 16
  // random characters do not guarantee each class is present.
  return `A${body}a7`;
}
