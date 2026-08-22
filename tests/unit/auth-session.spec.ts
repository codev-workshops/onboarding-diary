import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';

import { readSession, signSession, SESSION_TTL_SECONDS } from '@/src/modules/auth/session';

const USER_ID = '3f6b2e5a-9c4d-4f8a-9a1b-2c3d4e5f6a7b';

describe('session tokens', () => {
  it('round-trips the user id', async () => {
    const token = await signSession(USER_ID);

    await expect(readSession(token)).resolves.toEqual({ sub: USER_ID });
  });

  it('carries no role or permission claims, so privileges cannot be frozen into the cookie', async () => {
    const token = await signSession(USER_ID);
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()) as Record<
      string,
      unknown
    >;

    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'iss', 'sub']);
    expect(Number(payload.exp) - Number(payload.iat)).toBe(SESSION_TTL_SECONDS);
  });

  it('rejects a tampered payload', async () => {
    const [header, , signature] = (await signSession(USER_ID)).split('.');
    const forged = Buffer.from(JSON.stringify({ sub: 'someone-else' })).toString('base64url');

    await expect(readSession(`${header}.${forged}.${signature}`)).resolves.toBeNull();
  });

  it('rejects a token signed with a different secret', async () => {
    const foreign = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(USER_ID)
      .setIssuer('onboarding-diary')
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(new TextEncoder().encode('another-secret-that-is-long-enough-0123456789'));

    await expect(readSession(foreign)).resolves.toBeNull();
  });

  it('rejects an expired token and a missing cookie', async () => {
    const expired = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(USER_ID)
      .setIssuer('onboarding-diary')
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(process.env.SESSION_SECRET ?? ''));

    await expect(readSession(expired)).resolves.toBeNull();
    await expect(readSession(undefined)).resolves.toBeNull();
    await expect(readSession('not-a-token')).resolves.toBeNull();
  });
});
