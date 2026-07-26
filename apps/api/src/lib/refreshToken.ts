/**
 * Refresh tokens: 32 bytes of CSPRNG output, stored only as a SHA-256 hash, rotated on
 * every use, with family revocation on replay (TRD 5.2).
 */

import { createHash, randomBytes } from 'node:crypto';

import type { AppConfig } from '../config.js';
import { UnauthenticatedError } from './errors.js';
import type { Db } from './prisma.js';

export const REFRESH_COOKIE_NAME = 'refreshToken';
export const REFRESH_COOKIE_PATH = '/api/v1/auth';

export type IssuedRefreshToken = { token: string; expiresAt: Date };

type TtlConfig = Pick<AppConfig, 'REFRESH_TOKEN_TTL_DAYS'>;

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function expiryFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export async function issueRefreshToken(
  db: Db,
  config: TtlConfig,
  userId: string,
): Promise<IssuedRefreshToken> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = expiryFromNow(config.REFRESH_TOKEN_TTL_DAYS);
  await db.refreshToken.create({
    data: { userId, tokenHash: hashRefreshToken(token), expiresAt },
  });
  return { token, expiresAt };
}

/** Revoke every live token for a user — the replay defence (TRD 5.2). */
export async function revokeTokenFamily(db: Db, userId: string): Promise<void> {
  await db.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeRefreshToken(db: Db, token: string): Promise<void> {
  await db.refreshToken.updateMany({
    where: { tokenHash: hashRefreshToken(token), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Consume a refresh token and issue its replacement. Presenting an already-revoked token
 * revokes the whole family, because it means the token leaked.
 */
export async function rotateRefreshToken(
  db: Db,
  config: TtlConfig,
  token: string,
): Promise<{ userId: string; issued: IssuedRefreshToken }> {
  const existing = await db.refreshToken.findUnique({
    where: { tokenHash: hashRefreshToken(token) },
  });

  if (existing === null) throw new UnauthenticatedError('Refresh token is invalid');

  if (existing.revokedAt !== null) {
    await revokeTokenFamily(db, existing.userId);
    throw new UnauthenticatedError('Refresh token has already been used');
  }

  if (existing.expiresAt.getTime() <= Date.now()) {
    throw new UnauthenticatedError('Refresh token has expired');
  }

  await db.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });
  const issued = await issueRefreshToken(db, config, existing.userId);
  return { userId: existing.userId, issued };
}
