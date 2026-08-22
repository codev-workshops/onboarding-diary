import bcrypt from 'bcryptjs';

/** S1: bcrypt at cost 12. The seed uses the same constant. */
export const BCRYPT_COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Rejects a password that contains the local part of the email (§9.1). Length
 * and character-class rules live in the Zod schema so the client can apply the
 * identical checks.
 */
export function containsEmailLocalPart(password: string, email: string): boolean {
  const localPart = email.split('@')[0]?.trim().toLowerCase() ?? '';
  return localPart.length >= 3 && password.toLowerCase().includes(localPart);
}
