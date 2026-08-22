import { describe, expect, it } from 'vitest';

import {
  BCRYPT_COST,
  containsEmailLocalPart,
  hashPassword,
  verifyPassword,
} from '@/src/modules/auth/password';

describe('password hashing', () => {
  it('hashes with bcrypt at the required cost and verifies the original', async () => {
    const hash = await hashPassword('Onboard1ng!diary');

    expect(hash.startsWith(`$2b$${BCRYPT_COST}$`)).toBe(true);
    expect(BCRYPT_COST).toBeGreaterThanOrEqual(12);
    await expect(verifyPassword('Onboard1ng!diary', hash)).resolves.toBe(true);
  });

  it('rejects a wrong password and never stores the plaintext', async () => {
    const hash = await hashPassword('Onboard1ng!diary');

    await expect(verifyPassword('onboard1ng!diary', hash)).resolves.toBe(false);
    expect(hash).not.toContain('Onboard1ng');
  });

  it('salts, so the same password hashes differently each time', async () => {
    const [first, second] = await Promise.all([hashPassword('Onboard1ng!'), hashPassword('Onboard1ng!')]);

    expect(first).not.toEqual(second);
  });
});

describe('containsEmailLocalPart', () => {
  it.each([
    ['Ada.Lovelace99', 'ada.lovelace@onboarding.test', true],
    ['ADA-is-here-01', 'ada@onboarding.test', true],
    ['Onboard1ngDiary', 'ada.lovelace@onboarding.test', false],
    // A local part under three characters is too generic to reject on.
    ['AbAbAbAb12', 'ab@onboarding.test', false],
  ])('%s against %s -> %s', (password, email, expected) => {
    expect(containsEmailLocalPart(password, email)).toBe(expected);
  });
});
