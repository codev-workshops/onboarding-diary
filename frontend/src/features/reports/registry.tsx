"use client";

import Link from "next/link";
import formStyles from "@/components/ui/forms.module.css";
import tableStyles from "@/components/ui/table.module.css";
import type { NavItem } from "@/lib/registry/nav";
import type { RecruitTab, RecruitTabProps } from "@/lib/registry/recruitTabs";
import styles from "./reports.module.css";

/** S8 nav entry — every role; the screen scopes the recruit selector itself. */
export const REPORTS_NAV_ITEM: NavItem = { href: "/reports", label: "Reports", order: 800 };

/** Report route with the recruit preselected (used from /recruits/{id}). */
export function reportsHref(recruitId: string): string {
  return `/reports?recruitId=${encodeURIComponent(recruitId)}`;
}

function RecruitReportTab({ recruitId }: RecruitTabProps) {
  return (
    <div className={styles.entry} data-testid="recruit-report-tab">
      <p className={tableStyles.muted} style={{ margin: 0 }}>
        Export this recruit&apos;s tasks, issues and feedback for a date range as PDF or CSV.
      </p>
      <Link href={reportsHref(recruitId)} className={formStyles.button} data-testid="recruit-generate-report">
        Generate report
      </Link>
    </div>
  );
}

/** S8 "Generate report" entry point on /recruits/{id}. */
export const REPORTS_RECRUIT_TAB: RecruitTab = { id: "reports", label: "Report", order: 800, component: RecruitReportTab };
