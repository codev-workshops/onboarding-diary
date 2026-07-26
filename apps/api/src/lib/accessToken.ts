/** Access tokens: HS256 JWTs with a short TTL (TRD 5.2). */

import { ROLES, type Role } from '@onboarding-diary/shared';
import jwt from 'jsonwebtoken';

import type { AppConfig } from '../config.js';
import { UnauthenticatedError } from './errors.js';

export type AccessTokenClaims = { sub: string; role: Role };

export type IssuedAccessToken = { accessToken: string; accessTokenExpiresAt: string };

type TokenConfig = Pick<AppConfig, 'JWT_SECRET' | 'ACCESS_TOKEN_TTL'>;

export function signAccessToken(config: TokenConfig, claims: AccessTokenClaims): IssuedAccessToken {
  const expiresIn = config.ACCESS_TOKEN_TTL as NonNullable<jwt.SignOptions['expiresIn']>;
  const accessToken = jwt.sign({ role: claims.role }, config.JWT_SECRET, {
    algorithm: 'HS256',
    subject: claims.sub,
    expiresIn,
  });
  const decoded = jwt.decode(accessToken);
  const expiresAt =
    typeof decoded === 'object' && decoded !== null && typeof decoded.exp === 'number'
      ? new Date(decoded.exp * 1000).toISOString()
      : new Date().toISOString();
  return { accessToken, accessTokenExpiresAt: expiresAt };
}

/** Verify a token, rejecting expired, mis-signed, and malformed input with a 401. */
export function verifyAccessToken(config: TokenConfig, token: string): AccessTokenClaims {
  let payload: unknown;
  try {
    payload = jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (error) {
    const message =
      error instanceof jwt.TokenExpiredError
        ? 'Access token has expired'
        : 'Access token is invalid';
    throw new UnauthenticatedError(message);
  }

  if (typeof payload !== 'object' || payload === null) {
    throw new UnauthenticatedError('Access token is invalid');
  }
  const { sub, role } = payload as { sub?: unknown; role?: unknown };
  if (typeof sub !== 'string' || typeof role !== 'string' || !isRole(role)) {
    throw new UnauthenticatedError('Access token is invalid');
  }
  return { sub, role };
}

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}
