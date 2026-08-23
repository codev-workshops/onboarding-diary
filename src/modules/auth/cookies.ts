import type { NextResponse } from 'next/server';

import { SESSION_COOKIE, SESSION_TTL_SECONDS } from '@/src/modules/auth/session';
import { env } from '@/src/shared/config/env';

/**
 * S2: the session token only ever lives in an HttpOnly cookie — never in
 * `localStorage`, never in a response body. `SameSite=Lax` plus the JSON
 * content-type requirement is what stands in for CSRF tokens (O1).
 */
export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** Reads the session token out of a raw `Cookie` header, for route handlers. */
export function sessionTokenFrom(header: string | null): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === SESSION_COOKIE) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }
  return undefined;
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}
