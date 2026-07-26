/** Signup, login, refresh, and logout (TRD 4.2, 5.1, 5.2). */

import {
  DEFAULT_ROLE,
  type LoginBody,
  type SignupBody,
  type UserDto,
} from '@onboarding-diary/shared';

import type { AppConfig } from '../../config.js';
import { signAccessToken, type IssuedAccessToken } from '../../lib/accessToken.js';
import { EmailAlreadyExistsError, InvalidCredentialsError } from '../../lib/errors.js';
import { hashPassword, verifyAgainstDummyHash, verifyPassword } from '../../lib/password.js';
import type { Db } from '../../lib/prisma.js';
import {
  issueRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
  type IssuedRefreshToken,
} from '../../lib/refreshToken.js';
import { toUserDto } from '../../serializers/user.js';

export type AuthResult = {
  user: UserDto;
  access: IssuedAccessToken;
  refresh: IssuedRefreshToken;
};

type AuthConfig = Pick<AppConfig, 'JWT_SECRET' | 'ACCESS_TOKEN_TTL' | 'REFRESH_TOKEN_TTL_DAYS'>;

export async function signup(db: Db, config: AuthConfig, body: SignupBody): Promise<AuthResult> {
  const passwordHash = await hashPassword(body.password);

  const existing = await db.user.findUnique({ where: { email: body.email } });
  if (existing !== null) throw new EmailAlreadyExistsError();

  // The role is never taken from the request body: new accounts are always recruits.
  const user = await db.user.create({
    data: {
      email: body.email,
      fullName: body.fullName,
      passwordHash,
      role: DEFAULT_ROLE,
    },
  });

  return {
    user: toUserDto(user),
    access: signAccessToken(config, { sub: user.id, role: user.role }),
    refresh: await issueRefreshToken(db, config, user.id),
  };
}

export async function login(db: Db, config: AuthConfig, body: LoginBody): Promise<AuthResult> {
  const user = await db.user.findUnique({ where: { email: body.email } });

  if (user === null) {
    await verifyAgainstDummyHash(body.password);
    throw new InvalidCredentialsError();
  }

  const passwordMatches = await verifyPassword(user.passwordHash, body.password);
  if (!passwordMatches || !user.isActive) throw new InvalidCredentialsError();

  return {
    user: toUserDto(user),
    access: signAccessToken(config, { sub: user.id, role: user.role }),
    refresh: await issueRefreshToken(db, config, user.id),
  };
}

export async function refresh(
  db: Db,
  config: AuthConfig,
  presentedToken: string,
): Promise<AuthResult> {
  const { userId, issued } = await rotateRefreshToken(db, config, presentedToken);
  const user = await db.user.findUnique({ where: { id: userId } });

  if (user === null || !user.isActive) {
    // A deactivated account cannot refresh, and its remaining tokens are useless.
    await revokeRefreshToken(db, issued.token);
    throw new InvalidCredentialsError('This account can no longer be used');
  }

  return {
    user: toUserDto(user),
    access: signAccessToken(config, { sub: user.id, role: user.role }),
    refresh: issued,
  };
}

export async function logout(db: Db, presentedToken: string | undefined): Promise<void> {
  if (presentedToken === undefined) return;
  await revokeRefreshToken(db, presentedToken);
}
