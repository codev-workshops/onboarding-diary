import type { Role } from './constants';

/**
 * Per-role landing route after login (docs/ASSUMPTIONS.md §15). Each role has a
 * purpose-built home; other routes remain shared and role-scoped.
 */
export const LANDING_PATH: Record<Role, string> = {
  Recruit: '/dashboard',
  Manager: '/team',
  Admin: '/overview',
};

export function landingPathFor(role: Role): string {
  return LANDING_PATH[role];
}
