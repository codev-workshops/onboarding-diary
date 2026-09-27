import type { ComponentType } from "react";
import type { Role } from "@/lib/apiClient";

export interface RecruitTabProps {
  recruitId: string;
}

export interface RecruitTab {
  /** URL segment: `/recruits/{id}?tab=<id>`. */
  id: string;
  label: string;
  /** Absent = every role allowed on `/recruits/{id}` (MANAGER, ADMIN). */
  roles?: Role[];
  order?: number;
  component: ComponentType<RecruitTabProps>;
}

/**
 * `/recruits/{id}` tab registry: each slice appends ONE `registerRecruitTabs(...)`
 * line in `src/lib/registry/index.ts`; the page itself is never edited.
 */
const tabs: RecruitTab[] = [];

export function registerRecruitTabs(...added: RecruitTab[]) {
  for (const tab of added) {
    if (tabs.some((t) => t.id === tab.id)) continue;
    tabs.push(tab);
  }
}

export function recruitTabsFor(role: Role | null): RecruitTab[] {
  if (!role) return [];
  return tabs
    .map((tab, index) => ({ tab, index }))
    .sort((a, b) => (a.tab.order ?? 0) - (b.tab.order ?? 0) || a.index - b.index)
    .map(({ tab }) => tab)
    .filter((tab) => !tab.roles || tab.roles.includes(role));
}
