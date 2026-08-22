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
