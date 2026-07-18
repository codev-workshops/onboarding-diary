import { describe, expect, it } from 'vitest';
import { PasswordPolicy } from '../../src/auth/passwordPolicy.js';

describe('PasswordPolicy', () => {
  const policy = new PasswordPolicy();

  it('rejects passwords shorter than 8 characters', () => {
    const result = policy.validate('short');
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
  });

  it('accepts passwords of at least 8 characters', () => {
    expect(policy.validate('longenough').valid).toBe(true);
  });

  it('supports a configurable minimum length for future upgrades', () => {
    const strict = new PasswordPolicy(12);
    expect(strict.validate('elevenchars').valid).toBe(false);
    expect(strict.validate('twelvecharss').valid).toBe(true);
  });
});
