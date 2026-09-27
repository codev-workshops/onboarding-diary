/**
 * Slice registration — the ONE place shared UI registries are populated.
 *
 * Adding a slice (S4 questions, S5 issues, ...) means appending, in the marked
 * block below, one `registerNavItems(...)` and (if it has a recruit tab) one
 * `registerRecruitTabs(...)` call. Never edit `AppShell`, `/recruits/[id]` or
 * the core entries above the marker. See frontend/AGENTS.md
 * "Additive extension points".
 */
import { registerNavItems } from "@/lib/registry/nav";
import { registerRecruitTabs } from "@/lib/registry/recruitTabs";
import { TASKS_NAV_ITEM, TASKS_RECRUIT_TAB } from "@/features/tasks/registry";
import { ISSUES_NAV_ITEM, ISSUES_RECRUIT_TAB } from "@/features/issues/registry";
import { FEEDBACK_NAV_ITEM, FEEDBACK_RECRUIT_TAB } from "@/features/feedback/registry";

export * from "@/lib/registry/nav";
export * from "@/lib/registry/recruitTabs";

// ---- core (S1/S2) ------------------------------------------------------------------
registerNavItems(
  { href: "/", label: "Home", order: 0 },
  { href: "/profile", label: "My profile", order: 10 },
  { href: "/recruits", label: "Recruits", roles: ["MANAGER", "ADMIN"], order: 20 },
  { href: "/admin/users", label: "Users", roles: ["ADMIN"], order: 900 },
  { href: "/admin/assignments", label: "Assignments", roles: ["ADMIN"], order: 910 },
);

// ---- slices (S3+): one registration line per slice, appended below --------------------
registerNavItems(TASKS_NAV_ITEM); // S3
registerRecruitTabs(TASKS_RECRUIT_TAB); // S3
registerNavItems(ISSUES_NAV_ITEM); // S4
registerRecruitTabs(ISSUES_RECRUIT_TAB); // S4
registerNavItems(FEEDBACK_NAV_ITEM); // S5
registerRecruitTabs(FEEDBACK_RECRUIT_TAB); // S5
