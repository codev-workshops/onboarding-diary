import type { ComponentType } from "react";
import { useEffect } from "react";
import type { Role } from "@/lib/apiClient";
import type { RootStore } from "@/stores/RootStore";

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
  /**
   * Optional per-recruit gate for tabs whose data the API may refuse (e.g. S5
   * feedback, 403 NOT_ASSIGNED). `probe` is invoked once per recruit to ask the
   * API; `isVisible` reads the (observable) answer: `true` shows the tab,
   * `false` or `null` (unknown yet) hides it. Tabs without `visibility` are
   * always shown.
   */
  visibility?: {
    probe: (stores: RootStore, recruitId: string) => void;
    isVisible: (stores: RootStore, recruitId: string) => boolean | null;
  };
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

/**
 * `recruitTabsFor(role)` narrowed to the tabs the API allows for `recruitId`.
 * Runs each tab's `visibility.probe` once per recruit; call from an `observer`
 * component so `isVisible` answers re-render it.
 */
export function useVisibleRecruitTabs(stores: RootStore, role: Role | null, recruitId: string): RecruitTab[] {
  const candidates = recruitTabsFor(role);
  useEffect(() => {
    for (const tab of candidates) tab.visibility?.probe(stores, recruitId);
    // `candidates` is derived from the static registry + role; role and recruitId are the real inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stores, role, recruitId]);
  return candidates.filter((tab) => !tab.visibility || tab.visibility.isVisible(stores, recruitId) === true);
}

export function recruitTabsFor(role: Role | null): RecruitTab[] {
  if (!role) return [];
  return tabs
    .map((tab, index) => ({ tab, index }))
    .sort((a, b) => (a.tab.order ?? 0) - (b.tab.order ?? 0) || a.index - b.index)
    .map(({ tab }) => tab)
    .filter((tab) => !tab.roles || tab.roles.includes(role));
}
