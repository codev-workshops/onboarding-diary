import { NextResponse } from 'next/server';

import { recordAuditBestEffort } from '@/src/modules/audit/service';
import { clearSessionCookie, sessionTokenFrom } from '@/src/modules/auth/cookies';
import { readSession } from '@/src/modules/auth/session';
import { requireJsonContentType, route } from '@/src/shared/http/envelope';

export const runtime = 'nodejs';

/**
 * Idempotent, and deliberately unauthenticated: clearing a cookie that is
 * already absent or expired is not an error. It still demands the JSON content
 * type, so a cross-site form post cannot force a sign-out.
 */
export const POST = route(async (request) => {
  requireJsonContentType(request);

  // Recorded only when a session was actually ended, and best-effort: a failed
  // audit write must not leave the caller signed in.
  const session = await readSession(sessionTokenFrom(request.headers.get('cookie')));
  if (session) {
    recordAuditBestEffort({
      action: 'AUTH.LOGOUT',
      entityType: 'USER',
      entityId: session.sub,
      targetUserId: session.sub,
    });
  }

  const response = new NextResponse(null, { status: 204 });
  clearSessionCookie(response);
  return response;
});
