import { NextResponse } from 'next/server';

import { clearSessionCookie } from '@/src/modules/auth/cookies';
import { route } from '@/src/shared/http/envelope';

export const runtime = 'nodejs';

/**
 * Idempotent, and deliberately unauthenticated: clearing a cookie that is
 * already absent or expired is not an error.
 */
export const POST = route(async () => {
  const response = new NextResponse(null, { status: 204 });
  clearSessionCookie(response);
  return response;
});
