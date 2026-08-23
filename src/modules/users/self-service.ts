import { recordAudit } from '@/src/modules/audit/service';
import { containsEmailLocalPart, hashPassword, verifyPassword } from '@/src/modules/auth/password';
import { notFound } from '@/src/modules/authz/errors';
import { assertRole } from '@/src/modules/authz/policy';
import type { Actor } from '@/src/modules/authz/scope';
import { assertAssignableDepartment } from '@/src/modules/users/admin-service';
import { selfProfileSelect, toSelfProfile, type SelfProfile } from '@/src/modules/users/dto';
import { toUserSummary, userSummarySelect, type UserSummary } from '@/src/modules/users/dto';
import type { ChangePasswordInput, UpdateSelfInput } from '@/src/modules/users/self-schemas';
import { prisma } from '@/src/shared/db/prisma';
import { AppError, invalidCredentials } from '@/src/shared/http/errors';

/**
 * Self-service profile edit (§12.4). Only the three safe fields can be reached
 * from here at all; the privileged ones are refused by the route before this
 * function is called, and the update names its columns explicitly so a field
 * added to the schema later cannot become writable by accident.
 */
export async function updateOwnProfile(actor: Actor, input: UpdateSelfInput): Promise<SelfProfile> {
  const before = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { departmentId: true },
  });
  if (!before) throw notFound();

  if (input.department_id !== undefined) {
    await assertAssignableDepartment(input.department_id, before.departmentId);
  }

  const updated = await prisma.user.update({
    where: { id: actor.id },
    data: {
      fullName: input.full_name,
      departmentId: input.department_id,
      startDate: input.start_date ? new Date(`${input.start_date}T00:00:00Z`) : undefined,
    },
    select: selfProfileSelect,
  });

  return toSelfProfile(updated);
}

/**
 * Password change (§12.3). Proving the current password is what makes this
 * different from an admin reset: a borrowed session cannot silently take the
 * account over. Success clears `must_change_password`, which is the only way
 * out of the forced-change screen (US-70).
 */
export async function changeOwnPassword(actor: Actor, input: ChangePasswordInput): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { id: true, email: true, passwordHash: true },
  });
  if (!user) throw notFound();

  if (!(await verifyPassword(input.current_password, user.passwordHash))) throw invalidCredentials();

  if (containsEmailLocalPart(input.new_password, user.email)) {
    throw new AppError('VALIDATION_ERROR', 'The request contains invalid fields.', [
      {
        field: 'new_password',
        code: 'CONTAINS_EMAIL',
        message: 'Password must not contain your email address.',
      },
    ]);
  }

  const passwordHash = await hashPassword(input.new_password);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    });

    await recordAudit(
      {
        action: 'AUTH.PASSWORD_CHANGED',
        entityType: 'USER',
        entityId: user.id,
        targetUserId: user.id,
      },
      tx
    );
  });
}

/**
 * The direct reports of one user (§12.4). A manager may ask about themselves
 * and an admin about anyone; a manager asking about another manager gets the
 * same 404 the directory gives, because a 403 would confirm the account exists.
 */
export async function listDirectReports(actor: Actor, userId: string): Promise<UserSummary[]> {
  assertRole(actor, ['MANAGER', 'ADMIN']);
  if (actor.role !== 'ADMIN' && userId !== actor.id) throw notFound();

  const subject = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!subject) throw notFound();

  const reports = await prisma.user.findMany({
    where: { managerId: userId },
    orderBy: [{ fullName: 'asc' }],
    select: userSummarySelect,
  });

  return reports.map(toUserSummary);
}
