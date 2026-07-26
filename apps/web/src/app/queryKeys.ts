/**
 * Query-key factory (T-114). Every resource exposes `all`, `list(filters)`, and
 * `detail(id)` so a mutation can invalidate a whole resource with one prefix, and
 * `entryMutationKeys` lists what an entry write must invalidate besides its own resource.
 */

export type ListFilters = Record<string, unknown>;

function resource<const T extends string>(name: T) {
  return {
    all: [name] as const,
    list: (filters: ListFilters = {}) => [name, 'list', filters] as const,
    detail: (id: string) => [name, 'detail', id] as const,
  };
}

export const queryKeys = {
  me: ['me'] as const,
  users: { ...resource('users'), directReports: ['users', 'direct-reports'] as const },
  tasks: resource('tasks'),
  issues: resource('issues'),
  feedback: resource('feedback'),
  notes: resource('notes'),
  dashboard: {
    all: ['dashboard'] as const,
    detail: (ownerId?: string) => ['dashboard', 'detail', ownerId ?? 'me'] as const,
    admin: ['dashboard', 'admin'] as const,
  },
} as const;

export type EntryResource = 'tasks' | 'issues' | 'feedback' | 'notes';

/**
 * Writing an entry changes both its own list and every dashboard tile derived from it, so
 * both prefixes are invalidated together (TRD 6.4).
 */
export function entryMutationKeys(entry: EntryResource): readonly (readonly string[])[] {
  return [queryKeys[entry].all, queryKeys.dashboard.all];
}
