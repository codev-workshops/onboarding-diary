import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/app-shell/app-shell';
import { getCurrentUser } from '@/src/modules/auth/current-user';
import { permissionsFor } from '@/src/modules/auth/permissions';

export const dynamic = 'force-dynamic';

/**
 * The authoritative gate for the signed-in area. Middleware only checks the
 * cookie signature; this re-reads the user, so a deactivated or deleted account
 * is bounced out even with a still-valid token. The bounce goes through
 * /signed-out rather than straight to /login so the stale cookie is cleared —
 * otherwise middleware would send the request back here on every attempt.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/signed-out');
  // A temporary password reaches exactly one screen (S-04); the API enforces
  // the same rule, so this only saves the user a wall of refusals.
  if (user.must_change_password) redirect('/change-password');

  return (
    <AppShell user={user} permissions={permissionsFor(user.role)}>
      {children}
    </AppShell>
  );
}
