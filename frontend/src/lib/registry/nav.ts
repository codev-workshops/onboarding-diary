import type { Role } from "@/lib/apiClient";

export interface NavItem {
  href: string;
  label: string;
  /** Absent = visible to every signed-in user. */
  roles?: Role[];
  /** Lower renders first; core items use 0–99, slices 100+. Ties keep registration order. */
  order?: number;
}

/**
 * Nav-item registry: each slice appends ONE `registerNavItems([...])` line in
 * `src/lib/registry/index.ts` and never edits `AppShell`.
 */
const items: NavItem[] = [];

export function registerNavItems(...added: NavItem[]) {
  for (const item of added) {
    if (items.some((i) => i.href === item.href)) continue;
    items.push(item);
  }
}

export function navItems(): NavItem[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => (a.item.order ?? 0) - (b.item.order ?? 0) || a.index - b.index)
    .map(({ item }) => item);
}

export function navItemsFor(role: Role | null): NavItem[] {
  if (!role) return [];
  return navItems().filter((item) => !item.roles || item.roles.includes(role));
}
