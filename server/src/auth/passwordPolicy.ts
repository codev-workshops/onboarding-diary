/**
 * Password policy (docs/ASSUMPTIONS.md §1).
 *
 * Isolated here as a single, swappable source of truth so the rules can be
 * strengthened later without touching call sites. v1 policy: minimum 8
 * characters.
 */
export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
}

export class PasswordPolicy {
  constructor(private readonly minLength: number = 8) {}

  /** Human-readable description of the current policy. */
  describe(): string {
    return `Password must be at least ${this.minLength} characters.`;
  }

  /** Validates a password against the policy, returning all violations. */
  validate(password: string): PasswordPolicyResult {
    const errors: string[] = [];
    if (typeof password !== 'string' || password.length < this.minLength) {
      errors.push(`Password must be at least ${this.minLength} characters.`);
    }
    return { valid: errors.length === 0, errors };
  }
}

export const passwordPolicy = new PasswordPolicy();
