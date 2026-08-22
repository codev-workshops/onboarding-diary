'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import type { Permissions } from '@/src/modules/auth/permissions';

/**
 * Role-aware navigation. Hiding a link is presentation only — the server
 * authorizes every route and endpoint regardless of what is rendered (S3).
 */
export function NavLinks({ permissions }: { permissions: Permissions }) {
  const pathname = usePathname();

  const links = [
    { href: '/dashboard', label: 'Dashboard', visible: true },
    { href: '/tasks', label: 'Tasks', visible: true },
    { href: '/issues', label: 'Issues', visible: true },
    { href: '/team', label: 'Team', visible: permissions.can_view_team },
    { href: '/reports', label: 'Reports', visible: true },
    { href: '/admin/users', label: 'Users', visible: permissions.can_manage_users },
  ].filter((link) => link.visible);

  return (
    <ul className="flex flex-wrap items-center gap-1 text-sm">
      {links.map((link) => {
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'hover:bg-muted rounded-md px-3 py-1.5 transition-colors',
                active ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground'
              )}
            >
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
