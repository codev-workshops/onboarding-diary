"use client";

import type { NavItem } from "@/lib/registry/nav";
import type { RecruitTab, RecruitTabProps } from "@/lib/registry/recruitTabs";
import { FeedbackListView } from "@/features/feedback/FeedbackListView";

/** S5 nav entry — recruits only; managers/admins reach feedback through /recruits/{id}. */
export const FEEDBACK_NAV_ITEM: NavItem = { href: "/feedback", label: "Feedback", roles: ["NEW_RECRUIT"], order: 300 };

function RecruitFeedbackTab({ recruitId }: RecruitTabProps) {
  return (
    <FeedbackListView
      recruitId={recruitId}
      readOnly
      hrefFor={(feedbackId) => `/feedback/${feedbackId}?recruitId=${encodeURIComponent(recruitId)}`}
    />
  );
}

/**
 * S5 read-only Feedback tab on /recruits/{id}. Gated by D3: the tab is only
 * rendered once a `GET /feedback?recruitId=…&size=1` probe succeeds; a 403
 * NOT_ASSIGNED (manager not currently assigned) hides it entirely. The probe
 * runs on every visit to the page so a reassignment is reflected immediately;
 * the cached answer only bridges the round-trip.
 */
export const FEEDBACK_RECRUIT_TAB: RecruitTab = {
  id: "feedback",
  label: "Feedback",
  order: 300,
  component: RecruitFeedbackTab,
  visibility: {
    probe: (stores, recruitId) => void stores.feedback.probeVisibility(recruitId),
    isVisible: (stores, recruitId) => stores.feedback.isVisible(recruitId),
  },
};
