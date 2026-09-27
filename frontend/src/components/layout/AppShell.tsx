import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./AppShell.module.css";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tasks", label: "Tasks" },
  { href: "/issues", label: "Issues" },
  { href: "/feedback", label: "Feedback" },
  { href: "/notes", label: "Notes" },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          Onboarding Diary
        </Link>
        <nav className={styles.nav} aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={styles.navLink}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.headerActions}>
          <span className={styles.userPlaceholder} aria-label="Not signed in">
            Sign in
          </span>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <small>Onboarding Diary &middot; S0 layout shell</small>
      </footer>
    </div>
  );
}
