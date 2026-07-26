/** Password policy and argon2id hashing (TRD 5.1). */

import argon2 from 'argon2';

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@onboarding-diary/shared';

import { ValidationError } from './errors.js';

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

/** A short deny-list of the passwords attackers try first (FR-A3). */
const DENY_LIST = new Set([
  'password',
  'password1',
  'password123',
  'passw0rd123',
  '1234567890',
  '12345678901',
  'qwertyuiop',
  'qwerty12345',
  'letmein123',
  'iloveyou123',
  'welcome123',
  'admin12345',
  'changeme123',
  'onboarding',
  'onboarding123',
]);

/**
 * A hash of a value no one can present, used to keep login timing uniform for unknown
 * emails (AC-2). Generated lazily and cached for the process lifetime.
 */
let dummyHashPromise: Promise<string> | undefined;

export function assertPasswordPolicy(password: string): void {
  const details: { field: string; message: string }[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) {
    details.push({
      field: 'password',
      message: `Must be at least ${PASSWORD_MIN_LENGTH} characters`,
    });
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    details.push({
      field: 'password',
      message: `Must be at most ${PASSWORD_MAX_LENGTH} characters`,
    });
  }
  if (DENY_LIST.has(password.toLowerCase())) {
    details.push({ field: 'password', message: 'This password is too common' });
  }
  if (details.length > 0) throw new ValidationError('Request validation failed', details);
}

export async function hashPassword(password: string): Promise<string> {
  assertPasswordPolicy(password);
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/** Burn comparable time when the email is unknown so accounts cannot be enumerated. */
export async function verifyAgainstDummyHash(password: string): Promise<false> {
  dummyHashPromise ??= argon2.hash(`dummy:${Math.random()}`, ARGON2_OPTIONS);
  await verifyPassword(await dummyHashPromise, password);
  return false;
}
