import { NextResponse } from 'next/server';

import { clearSessionCookie } from '@/src/modules/auth/cookies';
import { requireJsonContentType, route } from '@/src/shared/http/envelope';

export const runtime = 'nodejs';

/**
 * Idempotent, and deliberately unauthenticated: clearing a cookie that is
 * already absent or expired is not an error. It still demands the JSON content
 * type, so a cross-site form post cannot force a sign-out.
 */
export const POST = route(async (request) => {
  requireJsonContentType(request);

  const response = new NextResponse(null, { status: 204 });
  clearSessionCookie(response);
  return response;
});
