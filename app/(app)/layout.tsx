import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/app-shell/app-shell';
import { getCurrentUser } from '@/src/modules/auth/current-user';
import { permissionsFor } from '@/src/modules/auth/permissions';

export const dynamic = 'force-dynamic';

/**
 * The authoritative gate for the signed-in area. Middleware only checks the
 * cookie signature; this re-reads the user, so a deactivated or deleted account
 * is bounced to the login screen even with a still-valid token.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <AppShell user={user} permissions={permissionsFor(user.role)}>
      {children}
    </AppShell>
  );
}
