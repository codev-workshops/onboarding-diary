"use client";

import { observer } from "mobx-react-lite";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { Role } from "@/lib/apiClient";
import { useStores } from "@/stores/StoreProvider";
import { RequireAuth } from "./RequireAuth";

/**
 * RequireAuth + role check. Authenticated users without one of `roles` are
 * sent to /403. The role always comes from the server-provided profile.
 */
export const RequireRole = observer(function RequireRole({
  roles,
  children,
}: {
  roles: Role[];
  children: ReactNode;
}) {
  return (
    <RequireAuth>
      <RoleGate roles={roles}>{children}</RoleGate>
    </RequireAuth>
  );
});

const RoleGate = observer(function RoleGate({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { auth } = useStores();
  const router = useRouter();
  const allowed = auth.hasRole(...roles);

  useEffect(() => {
    if (!allowed) router.replace("/403");
  }, [allowed, router]);

  if (!allowed) return null;
  return <>{children}</>;
});
