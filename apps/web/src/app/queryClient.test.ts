import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { invalidateEntry } from './queryClient.js';
import { entryMutationKeys, queryKeys } from './queryKeys.js';

describe('queryKeys', () => {
  it('nests list and detail keys under the resource prefix so one prefix invalidates all', () => {
    expect(queryKeys.tasks.list({ status: 'DONE' })).toEqual(['tasks', 'list', { status: 'DONE' }]);
    expect(queryKeys.tasks.detail('task-1')).toEqual(['tasks', 'detail', 'task-1']);
    expect(queryKeys.dashboard.detail()).toEqual(['dashboard', 'detail', 'me']);
    expect(entryMutationKeys('issues')).toEqual([['issues'], ['dashboard']]);
  });
});

describe('invalidateEntry', () => {
  it('invalidates the entry list and the dashboard, leaving other resources alone', async () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    await invalidateEntry(queryClient, 'tasks');

    expect(invalidate.mock.calls.map(([args]) => args?.queryKey)).toEqual([
      ['tasks'],
      ['dashboard'],
    ]);
  });

  it('marks a matching task list stale and refetches it', async () => {
    const queryClient = new QueryClient();
    const fetcher = vi.fn().mockResolvedValue(['first']);
    await queryClient.fetchQuery({ queryKey: queryKeys.tasks.list({ page: 1 }), queryFn: fetcher });
    await queryClient.fetchQuery({ queryKey: queryKeys.users.list(), queryFn: fetcher });

    await invalidateEntry(queryClient, 'tasks');

    expect(queryClient.getQueryState(queryKeys.tasks.list({ page: 1 }))?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(queryKeys.users.list())?.isInvalidated).toBe(false);
  });
});
