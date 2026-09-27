"use client";

import { observer } from "mobx-react-lite";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useStores } from "@/stores/StoreProvider";

/**
 * Renders children only for an authenticated user. Waits for AuthStore
 * hydration, then redirects anonymous visitors to /login?next=<path>.
 */
export const RequireAuth = observer(function RequireAuth({ children }: { children: ReactNode }) {
  const { auth } = useStores();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (auth.hydrated && !auth.isAuthenticated) {
      const next = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${next}`);
    }
  }, [auth, auth.hydrated, auth.isAuthenticated, pathname, router]);

  if (!auth.hydrated || !auth.isAuthenticated) {
    return (
      <p role="status" aria-live="polite" style={{ color: "var(--muted)" }}>
        Checking your session…
      </p>
    );
  }
  return <>{children}</>;
});
