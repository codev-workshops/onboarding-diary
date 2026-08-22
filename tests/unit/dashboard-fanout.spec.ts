/**
 * The team dashboard must cost the same number of queries whether a manager has
 * one recruit or fifty (§16.4). That is easy to write correctly once and lose
 * later to an innocuous-looking `for (const recruit of recruits)`, so the fan-in
 * is asserted directly: the repository aggregates are mocked and counted.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Actor } from '@/src/modules/authz/scope';

const taskStatusCounts = vi.fn();
const issueStatusCounts = vi.fn();
const feedbackCounts = vi.fn();
const noteCounts = vi.fn();
const lastActivityByOwner = vi.fn();
const listVisibleUsers = vi.fn();

vi.mock('@/src/modules/entries/repositories', () => ({
  taskStatusCounts: (...args: unknown[]) => taskStatusCounts(...args),
  issueStatusCounts: (...args: unknown[]) => issueStatusCounts(...args),
  feedbackCounts: (...args: unknown[]) => feedbackCounts(...args),
  noteCounts: (...args: unknown[]) => noteCounts(...args),
  lastActivityByOwner: (...args: unknown[]) => lastActivityByOwner(...args),
  taskRepository: { list: vi.fn(async () => []) },
  issueRepository: { list: vi.fn(async () => []) },
  feedbackRepository: { list: vi.fn(async () => []) },
  noteRepository: { list: vi.fn(async () => []) },
}));

vi.mock('@/src/modules/users/service', () => ({
  listVisibleUsers: (...args: unknown[]) => listVisibleUsers(...args),
  getScopedUser: vi.fn(),
}));

const { getTeamDashboard } = await import('@/src/modules/dashboard/service');

const manager: Actor = { id: 'manager-1', role: 'MANAGER' } as Actor;

const recruit = (index: number) => ({
  id: `recruit-${index}`,
  full_name: `Recruit ${index}`,
  role: 'RECRUIT' as const,
  start_date: '2026-01-01',
  manager_id: manager.id,
  is_active: true,
  department: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  taskStatusCounts.mockResolvedValue([]);
  issueStatusCounts.mockResolvedValue([]);
  feedbackCounts.mockResolvedValue([]);
  noteCounts.mockResolvedValue([]);
  lastActivityByOwner.mockResolvedValue([]);
});

describe('getTeamDashboard fan-out', () => {
  it('issues one aggregate per entry kind regardless of team size', async () => {
    for (const size of [1, 25]) {
      vi.clearAllMocks();
      taskStatusCounts.mockResolvedValue([]);
      issueStatusCounts.mockResolvedValue([]);
      feedbackCounts.mockResolvedValue([]);
      noteCounts.mockResolvedValue([]);
      lastActivityByOwner.mockResolvedValue([]);
      listVisibleUsers.mockResolvedValue(Array.from({ length: size }, (_, index) => recruit(index)));

      const dashboard = await getTeamDashboard(manager, { days: 30 });

      expect(dashboard.members).toHaveLength(size);
      expect(taskStatusCounts).toHaveBeenCalledTimes(1);
      expect(issueStatusCounts).toHaveBeenCalledTimes(1);
      expect(feedbackCounts).toHaveBeenCalledTimes(1);
      expect(noteCounts).toHaveBeenCalledTimes(1);
      expect(lastActivityByOwner).toHaveBeenCalledTimes(1);
    }
  });

  it('asks for the whole scope rather than naming an owner, so scope stays the repository’s job', async () => {
    listVisibleUsers.mockResolvedValue([recruit(0)]);
    await getTeamDashboard(manager, { days: 30 });

    expect(taskStatusCounts).toHaveBeenCalledWith(manager, expect.anything(), {});
    expect(lastActivityByOwner).toHaveBeenCalledWith(manager, {});
  });

  it('attributes each grouped row to its own recruit', async () => {
    listVisibleUsers.mockResolvedValue([recruit(0), recruit(1)]);
    taskStatusCounts.mockResolvedValue([
      { ownerId: 'recruit-0', status: 'DONE', count: 3 },
      { ownerId: 'recruit-0', status: 'TODO', count: 1 },
      { ownerId: 'recruit-1', status: 'CANCELLED', count: 2 },
    ]);

    const dashboard = await getTeamDashboard(manager, { days: 30 });
    const [first, second] = dashboard.members;

    expect(first.summary.tasks_total).toBe(4);
    expect(first.summary.task_completion_pct).toBe(75);
    expect(second.summary.tasks_total).toBe(2);
    expect(second.summary.task_completion_pct).toBe(0);
    expect(dashboard.totals.tasks_total).toBe(6);
  });
});
