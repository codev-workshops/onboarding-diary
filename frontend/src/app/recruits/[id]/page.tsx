"use client";

import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { RequireRole } from "@/components/auth/RequireRole";
import { useVisibleRecruitTabs } from "@/lib/registry";
import type { UserSummary } from "@/lib/apiClient";
import { useStores } from "@/stores/StoreProvider";
import formStyles from "@/components/ui/forms.module.css";
import tableStyles from "@/components/ui/table.module.css";
import styles from "./recruit.module.css";

/**
 * Recruit identity for the header. Admins load `GET /users/{id}`; managers only
 * see their own recruits, so the summary comes from `GET /me/recruits`.
 */
const RecruitHeader = observer(function RecruitHeader({ recruitId }: { recruitId: string }) {
  const { auth, admin, assignments } = useStores();
  const isAdmin = auth.role === "ADMIN";

  useEffect(() => {
    if (isAdmin) void admin.loadUser(recruitId);
    else void assignments.findMyRecruit(recruitId).catch(() => undefined);
  }, [isAdmin, admin, assignments, recruitId]);

  const summary: UserSummary | null = isAdmin
    ? admin.detail?.id === recruitId
      ? admin.detail
      : null
    : (assignments.myRecruitById[recruitId] ?? null);

  return (
    <div className={tableStyles.headerRow}>
      <div>
        <h1 id="recruit-title" className={formStyles.title} data-testid="recruit-name">
          {summary?.fullName ?? "Recruit"}
        </h1>
        <p className={formStyles.subtitle} style={{ marginBottom: 0 }}>
          {summary ? (
            <>
              {summary.email}
              {summary.department ? ` · ${summary.department}` : ""}
            </>
          ) : (
            "Read-only view of this recruit's diary."
          )}
        </p>
      </div>
      {isAdmin && (
        <Link href={`/admin/users/${recruitId}`} className={`${formStyles.button} ${formStyles.buttonSecondary}`}>
          Manage user
        </Link>
      )}
    </div>
  );
});

const RecruitPageContent = observer(function RecruitPageContent() {
  const stores = useStores();
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const tabs = useVisibleRecruitTabs(stores, stores.auth.role, params.id);
  const requested = search.get("tab");
  const active = tabs.find((t) => t.id === requested) ?? tabs[0];

  const selectTab = (id: string) => {
    // Only the tab key survives a switch; each tab owns its own query keys.
    router.replace(`${pathname}?tab=${id}`, { scroll: false });
  };

  return (
    <section className={`${formStyles.card} ${formStyles.wide}`} aria-labelledby="recruit-title" style={{ maxWidth: 1000 }}>
      <p className={tableStyles.muted}>
        <Link href="/recruits" className={tableStyles.rowLink}>
          ← All recruits
        </Link>
      </p>
      <RecruitHeader recruitId={params.id} />
      {tabs.length > 0 && (
        <div className={styles.tabs} role="tablist" aria-label="Recruit sections">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={active?.id === t.id}
              aria-controls={`panel-${t.id}`}
              className={`${styles.tab} ${active?.id === t.id ? styles.tabActive : ""}`}
              onClick={() => selectTab(t.id)}
              data-testid={`recruit-tab-${t.id}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      {active ? (
        <div role="tabpanel" id={`panel-${active.id}`} aria-labelledby={`tab-${active.id}`}>
          <active.component key={`${active.id}:${params.id}`} recruitId={params.id} />
        </div>
      ) : (
        <p className={tableStyles.empty}>Nothing to show yet.</p>
      )}
    </section>
  );
});

/** Manager/admin recruit view; sections come from the tab registry (one entry per slice). */
export default function RecruitPage() {
  return (
    <RequireRole roles={["MANAGER", "ADMIN"]}>
      <Suspense fallback={null}>
        <RecruitPageContent />
      </Suspense>
    </RequireRole>
  );
}
