"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { observer } from "mobx-react-lite";
import { usePathname, useRouter } from "next/navigation";
import type { Role } from "@/lib/apiClient";
import { useStores } from "@/stores/StoreProvider";
import styles from "./AppShell.module.css";

interface NavItem {
  href: string;
  label: string;
  roles?: Role[];
}

/** Items without `roles` are visible to every signed-in user. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/profile", label: "My profile" },
  { href: "/recruits", label: "Recruits", roles: ["MANAGER", "ADMIN"] },
  { href: "/admin/users", label: "Users", roles: ["ADMIN"] },
  { href: "/admin/assignments", label: "Assignments", roles: ["ADMIN"] },
];

export function navItemsFor(role: Role | null): NavItem[] {
  if (!role) return [];
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
}

const ROLE_LABELS: Record<Role, string> = {
  NEW_RECRUIT: "New recruit",
  MANAGER: "Manager",
  ADMIN: "Admin",
};

export const AppShell = observer(function AppShell({ children }: { children: ReactNode }) {
  const { auth } = useStores();
  const router = useRouter();
  const pathname = usePathname();
  const items = navItemsFor(auth.role);

  const onLogout = async () => {
    await auth.logout();
    router.push("/login");
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          Onboarding Diary
        </Link>
        {items.length > 0 && (
          <nav className={styles.nav} aria-label="Main navigation">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={styles.navLink}
                aria-current={pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`)) ? "page" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
        <div className={styles.headerActions}>
          {auth.isAuthenticated && auth.user ? (
            <>
              <Link href="/profile" className={styles.user} data-testid="current-user">
                <span className={styles.userName}>{auth.user.fullName}</span>
                <span className={styles.roleBadge}>{ROLE_LABELS[auth.user.role]}</span>
              </Link>
              <button type="button" className={styles.logout} onClick={() => void onLogout()}>
                Log out
              </button>
            </>
          ) : (
            <Link href="/login" className={styles.signIn}>
              Sign in
            </Link>
          )}
        </div>
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <small>Onboarding Diary</small>
      </footer>
    </div>
  );
});
