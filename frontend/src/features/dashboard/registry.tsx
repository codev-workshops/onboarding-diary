"use client";

import type { NavItem } from "@/lib/registry/nav";
import type { RecruitTab, RecruitTabProps } from "@/lib/registry/recruitTabs";
import { DashboardView } from "@/features/dashboard/DashboardView";

/** S7 nav entry — recruits only; managers/admins open a recruit's dashboard through /recruits/{id}. */
export const DASHBOARD_NAV_ITEM: NavItem = { href: "/dashboard", label: "Dashboard", roles: ["NEW_RECRUIT"], order: 50 };

function RecruitDashboardTab({ recruitId }: RecruitTabProps) {
  return <DashboardView recruitId={recruitId} />;
}

/** S7 Dashboard tab on /recruits/{id}; first tab so it is the default view. */
export const DASHBOARD_RECRUIT_TAB: RecruitTab = { id: "dashboard", label: "Dashboard", order: 0, component: RecruitDashboardTab };
