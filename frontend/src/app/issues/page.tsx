"use client";

import Link from "next/link";
import { Suspense } from "react";
import { RequireRole } from "@/components/auth/RequireRole";
import { IssueListView } from "@/features/issues/IssueListView";
import formStyles from "@/components/ui/forms.module.css";
import tableStyles from "@/components/ui/table.module.css";

/** Recruit issue log (REQ-FUNC-040, 042): list + URL-synced filters + pagination. */
export default function IssuesPage() {
  return (
    <RequireRole roles={["NEW_RECRUIT"]}>
      <section className={`${formStyles.card} ${formStyles.wide}`} aria-labelledby="issues-title" style={{ maxWidth: 1000 }}>
        <div className={tableStyles.headerRow}>
          <div>
            <h1 id="issues-title" className={formStyles.title}>
              My issues
            </h1>
            <p className={formStyles.subtitle} style={{ marginBottom: 0 }}>
              Record blockers and problems you hit, and track them to resolution.
            </p>
          </div>
          <Link href="/issues/new" className={formStyles.button} data-testid="new-issue">
            New issue
          </Link>
        </div>
        <Suspense fallback={null}>
          <IssueListView />
        </Suspense>
      </section>
    </RequireRole>
  );
}
