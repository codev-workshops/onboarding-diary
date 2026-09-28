"use client";

import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import { RequireRole } from "@/components/auth/RequireRole";
import { DashboardView } from "@/features/dashboard/DashboardView";
import { useStores } from "@/stores/StoreProvider";
import formStyles from "@/components/ui/forms.module.css";
import tableStyles from "@/components/ui/table.module.css";

const DashboardHeader = observer(function DashboardHeader() {
  const { auth, assignments } = useStores();

  useEffect(() => {
    void assignments.loadMyManager();
  }, [assignments]);

  const manager = assignments.myManager?.manager;
  return (
    <div className={tableStyles.headerRow}>
      <div>
        <h1 id="dashboard-title" className={formStyles.title}>
          Welcome back{auth.user ? `, ${auth.user.fullName}` : ""}
        </h1>
        <p className={formStyles.subtitle} style={{ marginBottom: 0 }} data-testid="dashboard-manager">
          {!assignments.myManagerLoaded
            ? "\u00a0"
            : assignments.myManagerError
              ? `Manager: ${assignments.myManagerError}`
              : manager
                ? `Manager: ${manager.fullName}`
                : "Manager: none yet"}
        </p>
      </div>
    </div>
  );
});

/** Recruit dashboard (REQ-FUNC-070..073): counts, completion, open issues, recent entries. */
export default function DashboardPage() {
  return (
    <RequireRole roles={["NEW_RECRUIT"]}>
      <section className={`${formStyles.card} ${formStyles.wide}`} aria-labelledby="dashboard-title" style={{ maxWidth: 1100 }}>
        <DashboardHeader />
        <DashboardView />
      </section>
    </RequireRole>
  );
}
