"use client";

import Link from "next/link";
import { Suspense } from "react";
import { RequireRole } from "@/components/auth/RequireRole";
import { FeedbackListView } from "@/features/feedback/FeedbackListView";
import formStyles from "@/components/ui/forms.module.css";
import tableStyles from "@/components/ui/table.module.css";

/** Recruit feedback notes (REQ-FUNC-050, 052): list + URL-synced filters + pagination. */
export default function FeedbackPage() {
  return (
    <RequireRole roles={["NEW_RECRUIT"]}>
      <section className={`${formStyles.card} ${formStyles.wide}`} aria-labelledby="feedback-title" style={{ maxWidth: 1000 }}>
        <div className={tableStyles.headerRow}>
          <div>
            <h1 id="feedback-title" className={formStyles.title}>
              My feedback
            </h1>
            <p className={formStyles.subtitle} style={{ marginBottom: 0 }}>
              Share what is working, what could be better and any concerns about your onboarding.
            </p>
          </div>
          <Link href="/feedback/new" className={formStyles.button} data-testid="new-feedback">
            New feedback
          </Link>
        </div>
        <Suspense fallback={null}>
          <FeedbackListView />
        </Suspense>
      </section>
    </RequireRole>
  );
}
