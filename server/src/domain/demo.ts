import type { Role } from './enums.js';
import { type AppConfig, config, onboardingEnablersEnabled } from '../config/env.js';

/**
 * Shared password for all demo accounts (docs/ASSUMPTIONS.md §9, §16 — demo only).
 * This is a well-known, non-secret credential used exclusively by the seeded
 * `@demo.local` accounts; it is never a real user's password.
 */
export const DEMO_PASSWORD = 'Passw0rd!';

/** Departments created by the demo seed (docs/ASSUMPTIONS.md §9). */
export const DEMO_DEPARTMENTS = ['Engineering', 'Design', 'Marketing'] as const;

export interface DemoAccount {
  email: string;
  name: string;
  role: Role;
  department: string;
}

/**
 * Static, code-defined list of the demo accounts the seed provisions. This is the
 * single source of truth surfaced by the demo-credentials helper — it is never
 * derived from the database, so it can never leak a real user (docs/ASSUMPTIONS.md
 * §16).
 */
export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { email: 'admin@demo.local', name: 'Ada Admin', role: 'Admin', department: 'Engineering' },
  {
    email: 'manager.eng@demo.local',
    name: 'Marcus Manager',
    role: 'Manager',
    department: 'Engineering',
  },
  {
    email: 'manager.design@demo.local',
    name: 'Dana Director',
    role: 'Manager',
    department: 'Design',
  },
  {
    email: 'recruit.rina@demo.local',
    name: 'Rina Recruit',
    role: 'Recruit',
    department: 'Engineering',
  },
  {
    email: 'recruit.raj@demo.local',
    name: 'Raj Rookie',
    role: 'Recruit',
    department: 'Engineering',
  },
  { email: 'recruit.dina@demo.local', name: 'Dina Newbie', role: 'Recruit', department: 'Design' },
  { email: 'recruit.mo@demo.local', name: 'Mo Marketer', role: 'Recruit', department: 'Marketing' },
];

export interface DemoCredentials {
  password: string;
  departments: readonly string[];
  accounts: readonly DemoAccount[];
}

/**
 * Returns the demo credentials helper payload, or `null` when onboarding enablers
 * are disabled. Gating on {@link onboardingEnablersEnabled} guarantees the demo
 * account list and password are exposed only in demo mode (docs/ASSUMPTIONS.md
 * §13, §16).
 */
export function getDemoCredentials(cfg: AppConfig = config): DemoCredentials | null {
  if (!onboardingEnablersEnabled(cfg)) return null;
  return {
    password: DEMO_PASSWORD,
    departments: DEMO_DEPARTMENTS,
    accounts: DEMO_ACCOUNTS,
  };
}
