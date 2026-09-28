"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import formStyles from "@/components/ui/forms.module.css";
import { ReportForm } from "@/features/reports/ReportForm";

function ReportsContent() {
  const search = useSearchParams();
  return <ReportForm recruitId={search.get("recruitId")} />;
}

/** Report generation screen (US-12, REQ-FUNC-080..086). */
export default function ReportsPage() {
  return (
    <RequireAuth>
      <section className={`${formStyles.card} ${formStyles.wide}`} aria-labelledby="reports-title" style={{ maxWidth: 720 }}>
        <h1 id="reports-title" className={formStyles.title}>
          Reports
        </h1>
        <p className={formStyles.subtitle}>Download tasks, issues and feedback for a date range as PDF or CSV.</p>
        <Suspense fallback={null}>
          <ReportsContent />
        </Suspense>
      </section>
    </RequireAuth>
  );
}
