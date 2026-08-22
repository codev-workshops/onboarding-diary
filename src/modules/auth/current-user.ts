import { cookies } from 'next/headers';

import { readSession, SESSION_COOKIE } from '@/src/modules/auth/session';
import { selfProfileSelect, toSelfProfile, type SelfProfile } from '@/src/modules/users/dto';
import { prisma } from '@/src/shared/db/prisma';
import { accountDeactivated, unauthenticated } from '@/src/shared/http/errors';
import { setContextActor } from '@/src/shared/http/request-context';

/**
 * Resolves the actor for the current request. The cookie only proves *which*
 * user is calling; role and `is_active` come from the database every time, so a
 * demotion or deactivation takes effect on the next request rather than when the
 * eight-hour token expires (D2).
 */
export async function getCurrentUser(request?: Request): Promise<SelfProfile | null> {
  const resolved = await resolveActor(request);
  return resolved.status === 'active' ? resolved.user : null;
}

export async function requireCurrentUser(request?: Request): Promise<SelfProfile> {
  const resolved = await resolveActor(request);
  if (resolved.status === 'deactivated') throw accountDeactivated();
  if (resolved.status === 'anonymous') throw unauthenticated();
  return resolved.user;
}

type ResolvedActor =
  { status: 'anonymous' } | { status: 'deactivated' } | { status: 'active'; user: SelfProfile };

/**
 * Separates "no usable credential" from "genuine credential, disabled account"
 * so the API can answer 401 and 403 `ACCOUNT_DEACTIVATED` respectively (AC3).
 * Callers that only gate rendering (the signed-in layout) collapse both into
 * null and bounce through /signed-out, which clears the stale cookie.
 */
async function resolveActor(request?: Request): Promise<ResolvedActor> {
  const token = request
    ? parseCookie(request.headers.get('cookie'), SESSION_COOKIE)
    : (await cookies()).get(SESSION_COOKIE)?.value;

  const claims = await readSession(token);
  if (!claims) return { status: 'anonymous' };

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: selfProfileSelect,
  });
  if (!user) return { status: 'anonymous' };
  if (!user.isActive) return { status: 'deactivated' };

  // Audit rows are written from deep inside services and from the error
  // wrapper, neither of which is handed the actor; recording it here means
  // every request that authenticated at all can be attributed.
  setContextActor({ id: user.id, role: user.role });

  return { status: 'active', user: toSelfProfile(user) };
}

function parseCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === name) {
      return decodeURIComponent(part.slice(separator + 1).trim());
    }
  }
  return undefined;
}
