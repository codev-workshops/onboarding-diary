import { describe, expect, it } from 'vitest';

import { SEED_USERS, readableUserIdsPreview } from '@/src/shared/testing/seed-fixtures';

/**
 * M1 has no authorization module yet, but the seed is what every later
 * authorization test will assert against, so its shape is worth pinning now:
 * two managers with disjoint recruit sets, plus one unassigned recruit that
 * only an admin can reach.
 */
describe('seed data shape', () => {
  it('creates one admin, two managers and seven recruits', () => {
    const byRole = (role: string): number => SEED_USERS.filter((user) => user.role === role).length;
    expect(byRole('ADMIN')).toBe(1);
    expect(byRole('MANAGER')).toBe(2);
    expect(byRole('RECRUIT')).toBe(7);
  });

  it('gives each manager three direct recruits', () => {
    for (const manager of SEED_USERS.filter((user) => user.role === 'MANAGER')) {
      const reports = SEED_USERS.filter((user) => user.managerEmail === manager.email);
      expect(reports).toHaveLength(3);
    }
  });

  it('leaves exactly one recruit unassigned so admin-only visibility is demonstrable', () => {
    const unassigned = SEED_USERS.filter((user) => user.role === 'RECRUIT' && !user.managerEmail);
    expect(unassigned.map((user) => user.email)).toEqual(['noah.silva@onboarding.test']);
  });

  it('keeps the two manager scopes disjoint', () => {
    const [first, second] = SEED_USERS.filter((user) => user.role === 'MANAGER');
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    const scopeA = readableUserIdsPreview(first!.email);
    const scopeB = readableUserIdsPreview(second!.email);
    const overlap = scopeA.filter((email) => scopeB.includes(email));
    expect(overlap).toEqual([]);
  });
});
