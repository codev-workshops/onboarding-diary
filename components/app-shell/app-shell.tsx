import type { ReactNode } from 'react';
import Link from 'next/link';

import { LogoutButton } from '@/components/app-shell/logout-button';
import { NavLinks } from '@/components/app-shell/nav-links';
import { Badge } from '@/components/ui/badge';
import type { Permissions } from '@/src/modules/auth/permissions';
import type { SelfProfile } from '@/src/modules/users/dto';

export function AppShell({
  user,
  permissions,
  children,
}: {
  user: SelfProfile;
  permissions: Permissions;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="bg-background border-b">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="font-semibold tracking-tight">
              Onboarding Diary
            </Link>
            <Badge variant="secondary">{user.role}</Badge>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{user.full_name}</span>
            <LogoutButton />
          </div>
        </div>
        <nav className="mx-auto max-w-6xl px-4 pb-2">
          <NavLinks permissions={permissions} />
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
