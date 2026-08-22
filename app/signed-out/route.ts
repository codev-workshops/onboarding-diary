import { NextResponse } from 'next/server';

import { clearSessionCookie } from '@/src/modules/auth/cookies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Where the signed-in area sends a request whose cookie is still signature-valid
 * but no longer resolves to an active user. Middleware cannot reach the database,
 * so it would keep bouncing such a request back to /dashboard; clearing the
 * cookie here is what breaks that loop. Deliberately a GET: it is reached by
 * redirect, and it destroys a session rather than creating one.
 */
export function GET(request: Request): NextResponse {
  const response = NextResponse.redirect(new URL('/login', request.url));
  clearSessionCookie(response);
  return response;
}
