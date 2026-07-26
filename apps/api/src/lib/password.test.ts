import { describe, expect, it } from 'vitest';

import { ValidationError } from './errors.js';
import { assertPasswordPolicy, hashPassword, verifyPassword } from './password.js';

describe('assertPasswordPolicy', () => {
  it('accepts a sufficiently long, uncommon password', () => {
    expect(() => assertPasswordPolicy('slightly-obscure-phrase')).not.toThrow();
  });

  it('rejects a short password', () => {
    expect(() => assertPasswordPolicy('short')).toThrow(ValidationError);
  });

  it('rejects an over-long password', () => {
    expect(() => assertPasswordPolicy('a'.repeat(129))).toThrow(ValidationError);
  });

  it('rejects deny-listed passwords regardless of case', () => {
    expect(() => assertPasswordPolicy('Password123')).toThrow(ValidationError);
  });
});

describe('hashPassword / verifyPassword', () => {
  it('round-trips a password without storing the plaintext', async () => {
    const hash = await hashPassword('a-reasonable-password');
    expect(hash).not.toContain('a-reasonable-password');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(await verifyPassword(hash, 'a-reasonable-password')).toBe(true);
  });

  it('rejects the wrong password', async () => {
    const hash = await hashPassword('a-reasonable-password');
    expect(await verifyPassword(hash, 'another-password')).toBe(false);
  });

  it('produces a different hash each time', async () => {
    const [first, second] = await Promise.all([
      hashPassword('a-reasonable-password'),
      hashPassword('a-reasonable-password'),
    ]);
    expect(first).not.toBe(second);
  });

  it('treats a corrupt hash as a failed verification', async () => {
    expect(await verifyPassword('not-a-hash', 'a-reasonable-password')).toBe(false);
  });

  it('refuses to hash a password that breaks the policy', async () => {
    await expect(hashPassword('short')).rejects.toThrow(ValidationError);
  });
});
