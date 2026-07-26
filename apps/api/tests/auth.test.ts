import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { hashRefreshToken, REFRESH_COOKIE_NAME } from '../src/lib/refreshToken.js';
import { verifyAccessToken } from '../src/lib/accessToken.js';
import { authenticatedAs, bearer, buildTestApp } from './helpers/app.js';
import { disconnectTestDb, getTestDb, resetDatabase } from './helpers/database.js';
import { createUser, TEST_PASSWORD } from './helpers/factories.js';

const testApp = buildTestApp();
const db = getTestDb();
const AUTH = '/api/v1/auth';

const VALID_SIGNUP = {
  email: 'new.recruit@example.com',
  password: 'a-decent-password-1',
  fullName: 'New Recruit',
};

function refreshCookie(setCookie: string | string[] | undefined): string {
  const values = setCookie === undefined ? [] : [setCookie].flat();
  const cookie = values.find((value) => value.startsWith(`${REFRESH_COOKIE_NAME}=`));
  if (cookie === undefined) throw new Error('No refresh cookie was set');
  return cookie;
}

function cookieValue(setCookie: string | string[] | undefined): string {
  return refreshCookie(setCookie).split(';')[0]?.split('=')[1] ?? '';
}

beforeEach(resetDatabase);
afterAll(disconnectTestDb);

describe('POST /auth/signup', () => {
  it('creates a recruit and returns tokens', async () => {
    const response = await testApp.agent.post(`${AUTH}/signup`).send(VALID_SIGNUP);

    expect(response.status).toBe(201);
    expect(response.body.data.user).toMatchObject({
      email: VALID_SIGNUP.email,
      fullName: VALID_SIGNUP.fullName,
      role: 'RECRUIT',
      isActive: true,
    });
    expect(response.body.data.user).not.toHaveProperty('passwordHash');
    expect(verifyAccessToken(testApp.config, response.body.data.accessToken).role).toBe('RECRUIT');

    const cookie = refreshCookie(response.headers['set-cookie']);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(await db.refreshToken.count()).toBe(1);
  });

  it('never stores the plaintext password', async () => {
    await testApp.agent.post(`${AUTH}/signup`).send(VALID_SIGNUP);
    const stored = await db.user.findUnique({ where: { email: VALID_SIGNUP.email } });
    expect(stored?.passwordHash).not.toContain(VALID_SIGNUP.password);
    expect(stored?.passwordHash.startsWith('$argon2id$')).toBe(true);
  });

  it('ignores a role supplied in the body', async () => {
    const response = await testApp.agent
      .post(`${AUTH}/signup`)
      .send({ ...VALID_SIGNUP, role: 'ADMIN' });
    expect(response.status).toBe(201);
    expect(response.body.data.user.role).toBe('RECRUIT');
  });

  it('rejects a duplicate email regardless of case', async () => {
    await testApp.agent.post(`${AUTH}/signup`).send(VALID_SIGNUP);
    const response = await testApp.agent
      .post(`${AUTH}/signup`)
      .send({ ...VALID_SIGNUP, email: 'New.Recruit@Example.com' });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it.each([
    [{ ...VALID_SIGNUP, email: 'not-an-email' }, 'email'],
    [{ ...VALID_SIGNUP, password: 'short' }, 'password'],
    [{ ...VALID_SIGNUP, fullName: '' }, 'fullName'],
  ])('returns 422 with field details for invalid input (%#)', async (body, field) => {
    const response = await testApp.agent.post(`${AUTH}/signup`).send(body);
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.map((detail: { field: string }) => detail.field)).toContain(
      field,
    );
  });

  it('rejects a deny-listed password', async () => {
    const response = await testApp.agent
      .post(`${AUTH}/signup`)
      .send({ ...VALID_SIGNUP, password: 'password123' });
    expect(response.status).toBe(422);
    expect(response.body.error.details[0].message).toMatch(/too common/i);
  });
});

describe('POST /auth/login', () => {
  it('returns tokens for valid credentials', async () => {
    const user = await createUser({ email: 'known@example.com' });
    const response = await testApp.agent
      .post(`${AUTH}/login`)
      .send({ email: 'KNOWN@example.com', password: TEST_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.data.user.id).toBe(user.id);
    expect(cookieValue(response.headers['set-cookie']).length).toBeGreaterThan(0);
  });

  it.each([
    ['an unknown email', { email: 'nobody@example.com', password: TEST_PASSWORD }],
    ['a wrong password', { email: 'known@example.com', password: 'definitely-wrong-1' }],
  ])('answers identically for %s', async (_label, body) => {
    await createUser({ email: 'known@example.com' });
    const response = await testApp.agent.post(`${AUTH}/login`).send(body);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(response.body.error.message).toBe('Email or password is incorrect');
  });

  it('refuses a deactivated account without revealing why', async () => {
    await createUser({ email: 'inactive@example.com', isActive: false });
    const response = await testApp.agent
      .post(`${AUTH}/login`)
      .send({ email: 'inactive@example.com', password: TEST_PASSWORD });
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('POST /auth/refresh', () => {
  it('rotates the refresh token and issues a new access token', async () => {
    const signup = await testApp.agent.post(`${AUTH}/signup`).send(VALID_SIGNUP);
    const firstCookie = refreshCookie(signup.headers['set-cookie']);

    const response = await testApp.agent.post(`${AUTH}/refresh`).set('Cookie', firstCookie);
    expect(response.status).toBe(200);
    expect(response.body.data.accessToken).toEqual(expect.any(String));

    const rotated = cookieValue(response.headers['set-cookie']);
    expect(rotated).not.toBe(cookieValue(signup.headers['set-cookie']));

    const previous = await db.refreshToken.findUnique({
      where: { tokenHash: hashRefreshToken(cookieValue(signup.headers['set-cookie'])) },
    });
    expect(previous?.revokedAt).not.toBeNull();
  });

  it('revokes the whole family when a used token is replayed', async () => {
    const signup = await testApp.agent.post(`${AUTH}/signup`).send(VALID_SIGNUP);
    const firstCookie = refreshCookie(signup.headers['set-cookie']);
    await testApp.agent.post(`${AUTH}/refresh`).set('Cookie', firstCookie);

    const replay = await testApp.agent.post(`${AUTH}/refresh`).set('Cookie', firstCookie);
    expect(replay.status).toBe(401);

    const live = await db.refreshToken.count({ where: { revokedAt: null } });
    expect(live).toBe(0);
  });

  it('rejects a missing or unknown token', async () => {
    expect((await testApp.agent.post(`${AUTH}/refresh`)).status).toBe(401);
    const bogus = await testApp.agent
      .post(`${AUTH}/refresh`)
      .set('Cookie', `${REFRESH_COOKIE_NAME}=made-up-token`);
    expect(bogus.status).toBe(401);
  });

  it('rejects an expired token', async () => {
    const signup = await testApp.agent.post(`${AUTH}/signup`).send(VALID_SIGNUP);
    await db.refreshToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    const response = await testApp.agent
      .post(`${AUTH}/refresh`)
      .set('Cookie', refreshCookie(signup.headers['set-cookie']));
    expect(response.status).toBe(401);
  });

  it('refuses to refresh a deactivated account', async () => {
    const signup = await testApp.agent.post(`${AUTH}/signup`).send(VALID_SIGNUP);
    await db.user.updateMany({ data: { isActive: false } });
    const response = await testApp.agent
      .post(`${AUTH}/refresh`)
      .set('Cookie', refreshCookie(signup.headers['set-cookie']));
    expect(response.status).toBe(401);
    expect(await db.refreshToken.count({ where: { revokedAt: null } })).toBe(0);
  });
});

describe('POST /auth/logout', () => {
  it('revokes the presented token and clears the cookie', async () => {
    const signup = await testApp.agent.post(`${AUTH}/signup`).send(VALID_SIGNUP);
    const cookie = refreshCookie(signup.headers['set-cookie']);

    const response = await testApp.agent.post(`${AUTH}/logout`).set('Cookie', cookie);
    expect(response.status).toBe(204);
    expect(await db.refreshToken.count({ where: { revokedAt: null } })).toBe(0);

    const reuse = await testApp.agent.post(`${AUTH}/refresh`).set('Cookie', cookie);
    expect(reuse.status).toBe(401);
  });

  it('succeeds without a cookie', async () => {
    expect((await testApp.agent.post(`${AUTH}/logout`)).status).toBe(204);
  });
});

describe('GET /auth/me', () => {
  it('returns the authenticated profile', async () => {
    const { user, token } = await authenticatedAs(testApp, 'MANAGER');
    const response = await testApp.agent.get(`${AUTH}/me`).set(...bearer(token));
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ id: user.id, role: 'MANAGER' });
    expect(response.body.data).not.toHaveProperty('passwordHash');
  });

  it.each([
    ['no header', undefined],
    ['a non-bearer header', 'Basic abc'],
    ['a malformed token', 'Bearer not.a.jwt'],
  ])('returns 401 with %s', async (_label, header) => {
    const request = testApp.agent.get(`${AUTH}/me`);
    if (header !== undefined) request.set('Authorization', header);
    const response = await request;
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('returns 401 once the account is deactivated', async () => {
    const { user, token } = await authenticatedAs(testApp);
    await db.user.update({ where: { id: user.id }, data: { isActive: false } });
    const response = await testApp.agent.get(`${AUTH}/me`).set(...bearer(token));
    expect(response.status).toBe(401);
  });
});

describe('auth rate limiting', () => {
  it('returns 429 with Retry-After once the window is exhausted', async () => {
    const limited = buildTestApp({ rateLimitsEnabled: true });
    const body = { email: 'nobody@example.com', password: 'wrong-password-here' };

    let last = await limited.agent.post(`${AUTH}/login`).send(body);
    for (let attempt = 1; attempt < 11 && last.status !== 429; attempt += 1) {
      last = await limited.agent.post(`${AUTH}/login`).send(body);
    }

    expect(last.status).toBe(429);
    expect(last.body.error.code).toBe('RATE_LIMITED');
    expect(Number(last.headers['retry-after'])).toBeGreaterThan(0);
  });
});
