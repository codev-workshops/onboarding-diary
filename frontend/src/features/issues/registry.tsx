"use client";

import type { NavItem } from "@/lib/registry/nav";
import type { RecruitTab, RecruitTabProps } from "@/lib/registry/recruitTabs";
import { IssueListView } from "@/features/issues/IssueListView";

/** S4 nav entry — recruits only; managers/admins reach issues through /recruits/{id}. */
export const ISSUES_NAV_ITEM: NavItem = { href: "/issues", label: "Issues", roles: ["NEW_RECRUIT"], order: 200 };

function RecruitIssuesTab({ recruitId }: RecruitTabProps) {
  return (
    <IssueListView
      recruitId={recruitId}
      readOnly
      hrefFor={(issueId) => `/issues/${issueId}?recruitId=${encodeURIComponent(recruitId)}`}
    />
  );
}

/** S4 read-only Issues tab on /recruits/{id}. */
export const ISSUES_RECRUIT_TAB: RecruitTab = { id: "issues", label: "Issues", order: 200, component: RecruitIssuesTab };
