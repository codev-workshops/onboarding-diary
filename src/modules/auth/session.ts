import { jwtVerify, SignJWT } from 'jose';

import { env } from '@/src/shared/config/env';

export const SESSION_COOKIE = 'od_session';
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

const ISSUER = 'onboarding-diary';
const ALGORITHM = 'HS256';

/**
 * The token carries only the user id. Role and `is_active` are re-read from the
 * database on every request (D2), so a deactivated or demoted user loses access
 * immediately rather than at the end of the session's eight hours.
 */
export type SessionClaims = { sub: string };

function secret(): Uint8Array {
  return new TextEncoder().encode(env.SESSION_SECRET);
}

export function signSession(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret());
}

/** Returns null for anything not a currently valid token — expired, tampered or foreign. */
export async function readSession(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      issuer: ISSUER,
      algorithms: [ALGORITHM],
    });
    return payload.sub ? { sub: payload.sub } : null;
  } catch {
    return null;
  }
}
