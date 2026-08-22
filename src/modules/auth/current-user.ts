import { cookies } from 'next/headers';

import { readSession, SESSION_COOKIE } from '@/src/modules/auth/session';
import { selfProfileSelect, toSelfProfile, type SelfProfile } from '@/src/modules/users/dto';
import { prisma } from '@/src/shared/db/prisma';
import { unauthenticated } from '@/src/shared/http/errors';

/**
 * Resolves the actor for the current request. The cookie only proves *which*
 * user is calling; role and `is_active` come from the database every time, so a
 * demotion or deactivation takes effect on the next request rather than when the
 * eight-hour token expires (D2).
 */
export async function getCurrentUser(request?: Request): Promise<SelfProfile | null> {
  const token = request
    ? parseCookie(request.headers.get('cookie'), SESSION_COOKIE)
    : (await cookies()).get(SESSION_COOKIE)?.value;

  const claims = await readSession(token);
  if (!claims) return null;

  const user = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: selfProfileSelect,
  });
  if (!user || !user.isActive) return null;

  return toSelfProfile(user);
}

export async function requireCurrentUser(request?: Request): Promise<SelfProfile> {
  const user = await getCurrentUser(request);
  if (!user) throw unauthenticated();
  return user;
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
