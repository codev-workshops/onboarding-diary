import { describe, expect, it } from 'vitest';

import { needsAttention } from '@/components/dashboard/team-roster';
import { dashboardQuerySchema } from '@/src/modules/dashboard/schemas';
import { completionPct } from '@/src/modules/dashboard/service';

const NOW = new Date('2026-03-01T09:00:00.000Z');

const member = (overrides: {
  daysSinceStart?: number;
  completion?: number;
  critical?: number;
  lastActivityAt?: string | null;
}) => ({
  user: {
    id: 'u1',
    full_name: 'Test Recruit',
    department: null,
    start_date: '2026-01-01',
    days_since_start: overrides.daysSinceStart ?? 30,
    is_active: true,
  },
  summary: {
    tasks_total: 10,
    tasks_done: 5,
    tasks_cancelled: 0,
    task_completion_pct: overrides.completion ?? 80,
    issues_total: 1,
    issues_open: 1,
    issues_critical_open: overrides.critical ?? 0,
    feedback_total: 0,
    notes_total: 0,
  },
  last_activity_at:
    overrides.lastActivityAt === undefined ? '2026-02-28T10:00:00.000Z' : overrides.lastActivityAt,
});

describe('completionPct (C3)', () => {
  it('excludes cancelled tasks from the denominator rather than the numerator', () => {
    // 4 of 10 done, 2 cancelled -> 4/8, not 4/10 and not 6/10.
    expect(completionPct(4, 10, 2)).toBe(50);
  });

  it('reports 0 rather than dividing by zero when every task is cancelled', () => {
    expect(completionPct(0, 3, 3)).toBe(0);
    expect(completionPct(0, 0, 0)).toBe(0);
  });

  it('rounds to one decimal place', () => {
    expect(completionPct(1, 3, 0)).toBe(33.3);
    expect(completionPct(2, 3, 0)).toBe(66.7);
  });
});

describe('needsAttention', () => {
  it('flags a critical open issue however healthy everything else looks', () => {
    expect(needsAttention(member({ critical: 1, completion: 100 }), NOW)).toBe(true);
  });

  it('flags a stalled recruit only after the second week', () => {
    expect(needsAttention(member({ daysSinceStart: 10, completion: 10 }), NOW)).toBe(false);
    expect(needsAttention(member({ daysSinceStart: 20, completion: 10 }), NOW)).toBe(true);
  });

  it('flags a week of silence, and spares a recruit who only started yesterday', () => {
    expect(needsAttention(member({ lastActivityAt: '2026-02-20T10:00:00.000Z' }), NOW)).toBe(true);
    expect(needsAttention(member({ lastActivityAt: null, daysSinceStart: 2 }), NOW)).toBe(false);
    expect(needsAttention(member({ lastActivityAt: null, daysSinceStart: 9 }), NOW)).toBe(true);
  });

  it('leaves a recently active recruit alone', () => {
    expect(needsAttention(member({}), NOW)).toBe(false);
  });
});

describe('dashboardQuerySchema', () => {
  it('defaults to 30 days', () => {
    expect(dashboardQuerySchema.parse({}).days).toBe(30);
  });

  it('accepts the offered periods and refuses anything else', () => {
    expect(dashboardQuerySchema.parse({ days: '90' }).days).toBe(90);
    expect(dashboardQuerySchema.safeParse({ days: '31' }).success).toBe(false);
    expect(dashboardQuerySchema.safeParse({ days: '-7' }).success).toBe(false);
    expect(dashboardQuerySchema.safeParse({ days: 'all' }).success).toBe(false);
  });

  it('rejects unknown parameters so a filter cannot be smuggled past the schema', () => {
    expect(dashboardQuerySchema.safeParse({ days: '30', owner_id: 'someone-else' }).success).toBe(false);
  });
});
