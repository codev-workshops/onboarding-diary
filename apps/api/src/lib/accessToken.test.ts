import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';

import { signAccessToken, verifyAccessToken } from './accessToken.js';
import { UnauthenticatedError } from './errors.js';

const config = { JWT_SECRET: 'x'.repeat(32), ACCESS_TOKEN_TTL: '15m' };

describe('signAccessToken', () => {
  it('issues an HS256 token carrying sub and role', () => {
    const { accessToken, accessTokenExpiresAt } = signAccessToken(config, {
      sub: 'user-1',
      role: 'MANAGER',
    });
    expect(verifyAccessToken(config, accessToken)).toEqual({ sub: 'user-1', role: 'MANAGER' });
    expect(jwt.decode(accessToken, { complete: true })?.header.alg).toBe('HS256');
    expect(new Date(accessTokenExpiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('expires 15 minutes out by default', () => {
    const { accessTokenExpiresAt } = signAccessToken(config, { sub: 'u', role: 'RECRUIT' });
    const seconds = (new Date(accessTokenExpiresAt).getTime() - Date.now()) / 1000;
    expect(seconds).toBeGreaterThan(14 * 60);
    expect(seconds).toBeLessThanOrEqual(15 * 60);
  });
});

describe('verifyAccessToken', () => {
  it('rejects an expired token', () => {
    const expired = jwt.sign({ role: 'RECRUIT' }, config.JWT_SECRET, {
      algorithm: 'HS256',
      subject: 'user-1',
      expiresIn: '-1s',
    });
    expect(() => verifyAccessToken(config, expired)).toThrow(/expired/i);
  });

  it('rejects a token signed with another secret', () => {
    const foreign = jwt.sign({ role: 'ADMIN' }, 'y'.repeat(32), {
      algorithm: 'HS256',
      subject: 'user-1',
    });
    expect(() => verifyAccessToken(config, foreign)).toThrow(UnauthenticatedError);
  });

  it('rejects a malformed token', () => {
    expect(() => verifyAccessToken(config, 'not.a.token')).toThrow(UnauthenticatedError);
  });

  it('rejects a token whose role claim is not a known role', () => {
    const odd = jwt.sign({ role: 'SUPERUSER' }, config.JWT_SECRET, {
      algorithm: 'HS256',
      subject: 'user-1',
    });
    expect(() => verifyAccessToken(config, odd)).toThrow(UnauthenticatedError);
  });
});
