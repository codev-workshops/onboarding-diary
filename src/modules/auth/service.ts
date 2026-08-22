import { Prisma } from '@prisma/client';

import { containsEmailLocalPart, hashPassword, verifyPassword } from '@/src/modules/auth/password';
import { signSession } from '@/src/modules/auth/session';
import { selfProfileSelect, toSelfProfile, type SelfProfile } from '@/src/modules/users/dto';
import { AppError, invalidCredentials } from '@/src/shared/http/errors';
import type { LoginInput, SignupInput } from '@/src/shared/schemas/auth';
import { prisma } from '@/src/shared/db/prisma';

export type AuthResult = { user: SelfProfile; token: string };

/**
 * Self-registration. The role is hard-coded to RECRUIT (S13) — the schema has no
 * `role` field at all, so a caller cannot smuggle one in.
 */
export async function signup(input: SignupInput): Promise<AuthResult> {
  if (containsEmailLocalPart(input.password, input.email)) {
    throw new AppError('VALIDATION_ERROR', 'The request contains invalid fields.', [
      {
        field: 'password',
        code: 'CONTAINS_EMAIL',
        message: 'Password must not contain your email address.',
      },
    ]);
  }

  if (input.department_id) {
    const department = await prisma.department.findFirst({
      where: { id: input.department_id, isActive: true },
      select: { id: true },
    });
    if (!department) {
      throw new AppError('VALIDATION_ERROR', 'The request contains invalid fields.', [
        { field: 'department_id', code: 'NOT_FOUND', message: 'Choose a department from the list.' },
      ]);
    }
  }

  const passwordHash = await hashPassword(input.password);

  try {
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: input.full_name,
        role: 'RECRUIT',
        departmentId: input.department_id ?? null,
        startDate: new Date(`${input.start_date}T00:00:00Z`),
      },
      select: selfProfileSelect,
    });
    return { user: toSelfProfile(user), token: await signSession(user.id) };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError('EMAIL_ALREADY_REGISTERED', 'An account with this email already exists.');
    }
    throw error;
  }
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { ...selfProfileSelect, passwordHash: true },
  });

  // Hash a throwaway password when the account is unknown so the response time
  // does not distinguish "no such user" from "wrong password" (S12).
  const passwordMatches = user
    ? await verifyPassword(input.password, user.passwordHash)
    : await verifyPassword(input.password, DUMMY_HASH).then(() => false);

  if (!user || !passwordMatches) {
    throw invalidCredentials();
  }

  // S13: deactivated users cannot authenticate. Checked after the password so a
  // wrong password on a disabled account still reads as invalid credentials.
  if (!user.isActive) {
    throw new AppError('ACCOUNT_DEACTIVATED', 'This account has been deactivated.');
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  return { user: toSelfProfile(user), token: await signSession(user.id) };
}

/** bcrypt hash of a value no one can supply; used only to equalise login timing. */
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEeO1Yc8IqSTZBnQGH2mSD1sfL0ByPWs9dK';
