/**
 * The seeded org chart, expressed independently of the database so that tests
 * can assert on scope shape without a live Postgres connection. Kept in sync
 * with prisma/seed.ts by tests/unit/seed-shape.spec.ts.
 */
export type SeedRole = 'ADMIN' | 'MANAGER' | 'RECRUIT';

export type SeedUserFixture = {
  email: string;
  role: SeedRole;
  managerEmail?: string;
};

export const SEED_USERS: readonly SeedUserFixture[] = [
  { email: 'admin@onboarding.test', role: 'ADMIN' },
  { email: 'marcus.bell@onboarding.test', role: 'MANAGER' },
  { email: 'dana.lee@onboarding.test', role: 'MANAGER' },
  { email: 'priya.sharma@onboarding.test', role: 'RECRUIT', managerEmail: 'marcus.bell@onboarding.test' },
  { email: 'sam.okafor@onboarding.test', role: 'RECRUIT', managerEmail: 'marcus.bell@onboarding.test' },
  { email: 'tom.nguyen@onboarding.test', role: 'RECRUIT', managerEmail: 'marcus.bell@onboarding.test' },
  { email: 'aisha.khan@onboarding.test', role: 'RECRUIT', managerEmail: 'dana.lee@onboarding.test' },
  { email: 'ben.carter@onboarding.test', role: 'RECRUIT', managerEmail: 'dana.lee@onboarding.test' },
  { email: 'chloe.martin@onboarding.test', role: 'RECRUIT', managerEmail: 'dana.lee@onboarding.test' },
  { email: 'noah.silva@onboarding.test', role: 'RECRUIT' },
];

/**
 * Email-level preview of readable_user_ids(actor) over the seeded org chart.
 * The real implementation lands in M3 and resolves ids in SQL; this exists so
 * the seed can be asserted before that module exists.
 */
export function readableUserIdsPreview(actorEmail: string): string[] {
  const actor = SEED_USERS.find((user) => user.email === actorEmail);
  if (!actor) return [];
  if (actor.role === 'ADMIN') return SEED_USERS.map((user) => user.email);
  if (actor.role === 'MANAGER') {
    return [
      actor.email,
      ...SEED_USERS.filter((user) => user.managerEmail === actor.email).map((user) => user.email),
    ];
  }
  return [actor.email];
}
