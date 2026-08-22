import { Prisma } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { hashPassword } from '@/src/modules/auth/password';
import { SESSION_COOKIE, signSession } from '@/src/modules/auth/session';

/**
 * Route-level tests over a mocked Prisma client: they exercise the real
 * handlers, envelope, cookies and validation without needing a database, so
 * they run in CI before migrations.
 */
const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  department: { findFirst: vi.fn(), findMany: vi.fn() },
}));

vi.mock('@/src/shared/db/prisma', () => ({ prisma: prismaMock }));

const { POST: signup } = await import('@/app/api/v1/auth/signup/route');
const { POST: login } = await import('@/app/api/v1/auth/login/route');
const { POST: logout } = await import('@/app/api/v1/auth/logout/route');
const { GET: me } = await import('@/app/api/v1/auth/me/route');

const USER_ID = '3f6b2e5a-9c4d-4f8a-9a1b-2c3d4e5f6a7b';
const PASSWORD = 'Onboard1ngDiary';

function userRow(overrides: Record<string, unknown> = {}) {
  return {
    id: USER_ID,
    email: 'ada@onboarding.test',
    fullName: 'Ada Lovelace',
    role: 'RECRUIT',
    startDate: new Date('2026-03-02T00:00:00Z'),
    isActive: true,
    createdAt: new Date('2026-03-01T09:00:00Z'),
    department: { id: '11111111-1111-4111-8111-111111111111', name: 'Engineering' },
    manager: null,
    ...overrides,
  };
}

function jsonRequest(url: string, body: unknown, cookie?: string): Request {
  return new Request(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

const signupBody = {
  email: 'ada@onboarding.test',
  password: PASSWORD,
  full_name: 'Ada Lovelace',
  start_date: '2026-03-02',
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe('POST /api/v1/auth/signup', () => {
  it('creates a RECRUIT and sets an HttpOnly session cookie', async () => {
    prismaMock.user.create.mockResolvedValue(userRow());

    const response = await signup(jsonRequest('http://localhost/api/v1/auth/signup', signupBody));
    const body = (await response.json()) as { data: { user: { role: string; email: string } } };

    expect(response.status).toBe(201);
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'RECRUIT' }) })
    );
    expect(body.data.user.role).toBe('RECRUIT');

    const cookie = response.headers.get('set-cookie') ?? '';
    expect(cookie).toContain(`${SESSION_COOKIE}=`);
    expect(cookie.toLowerCase()).toContain('httponly');
    expect(cookie.toLowerCase()).toContain('samesite=lax');
    expect(cookie).toContain('Max-Age=28800');
  });

  it('stores a bcrypt hash and never echoes the password back', async () => {
    prismaMock.user.create.mockResolvedValue(userRow());

    const response = await signup(jsonRequest('http://localhost/api/v1/auth/signup', signupBody));
    const raw = JSON.stringify(await response.json());
    const created = prismaMock.user.create.mock.calls[0][0] as { data: { passwordHash: string } };

    expect(created.data.passwordHash).toMatch(/^\$2[aby]\$12\$/);
    expect(raw).not.toContain(PASSWORD);
    expect(raw).not.toContain('passwordHash');
  });

  it('refuses a client-supplied role instead of honouring it', async () => {
    const response = await signup(
      jsonRequest('http://localhost/api/v1/auth/signup', { ...signupBody, role: 'ADMIN' })
    );

    expect(response.status).toBe(422);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('reports field-level validation details for a weak password', async () => {
    const response = await signup(
      jsonRequest('http://localhost/api/v1/auth/signup', { ...signupBody, password: 'short1A' })
    );
    const body = (await response.json()) as {
      error: { code: string; request_id: string; details: { field: string }[] };
    };

    expect(response.status).toBe(422);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.request_id).toBeTruthy();
    expect(body.error.details.map((detail) => detail.field)).toContain('password');
  });

  it('rejects a password containing the email local part', async () => {
    const response = await signup(
      jsonRequest('http://localhost/api/v1/auth/signup', { ...signupBody, password: 'Ada12345678' })
    );
    const body = (await response.json()) as { error: { details: { code: string }[] } };

    expect(response.status).toBe(422);
    expect(body.error.details[0].code).toBe('CONTAINS_EMAIL');
  });

  it('maps a unique-email collision to 409 without leaking the database error', async () => {
    prismaMock.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed on the fields: (`email`)', {
        code: 'P2002',
        clientVersion: 'test',
      })
    );

    const response = await signup(jsonRequest('http://localhost/api/v1/auth/signup', signupBody));
    const body = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(409);
    expect(body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
    expect(body.error.message).not.toContain('Unique constraint');
  });

  it('requires a JSON content type, which is what keeps a cross-site form post out', async () => {
    const response = await signup(
      new Request('http://localhost/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'email=ada@onboarding.test',
      })
    );

    expect(response.status).toBe(415);
  });
});

describe('POST /api/v1/auth/login', () => {
  it('accepts correct credentials and sets a session cookie', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...userRow(),
      passwordHash: await hashPassword(PASSWORD),
    });
    prismaMock.user.update.mockResolvedValue({});

    const response = await login(
      jsonRequest('http://localhost/api/v1/auth/login', {
        email: 'ada@onboarding.test',
        password: PASSWORD,
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain(`${SESSION_COOKIE}=`);
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { lastLoginAt: expect.any(Date) } })
    );
  });

  it('returns the identical error for an unknown email and a wrong password', async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    const unknown = await login(
      jsonRequest('http://localhost/api/v1/auth/login', {
        email: 'nobody@onboarding.test',
        password: PASSWORD,
      })
    );

    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...userRow(),
      passwordHash: await hashPassword(PASSWORD),
    });
    const wrongPassword = await login(
      jsonRequest('http://localhost/api/v1/auth/login', {
        email: 'ada@onboarding.test',
        password: 'WrongPassw0rd',
      })
    );

    const [a, b] = (await Promise.all([unknown.json(), wrongPassword.json()])) as {
      error: { code: string; message: string };
    }[];

    expect(unknown.status).toBe(401);
    expect(wrongPassword.status).toBe(401);
    expect(a.error.code).toBe('INVALID_CREDENTIALS');
    expect(a.error.message).toBe(b.error.message);
    expect(unknown.headers.get('set-cookie')).toBeNull();
  });

  it('refuses a deactivated account even with the right password', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...userRow({ isActive: false }),
      passwordHash: await hashPassword(PASSWORD),
    });

    const response = await login(
      jsonRequest('http://localhost/api/v1/auth/login', {
        email: 'ada@onboarding.test',
        password: PASSWORD,
      })
    );
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(403);
    expect(body.error.code).toBe('ACCOUNT_DEACTIVATED');
    expect(response.headers.get('set-cookie')).toBeNull();
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('expires the cookie and answers 204', async () => {
    const response = await logout(jsonRequest('http://localhost/api/v1/auth/logout', {}));

    expect(response.status).toBe(204);
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });

  it('refuses a cross-site form post, which cannot set the JSON content type', async () => {
    const response = await logout(
      new Request('http://localhost/api/v1/auth/logout', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: 'a=1',
      })
    );
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(415);
    expect(body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
    expect(response.headers.get('set-cookie')).toBeNull();
  });
});

describe('GET /api/v1/auth/me', () => {
  async function get(cookie?: string): Promise<Response> {
    return me(
      new Request('http://localhost/api/v1/auth/me', {
        headers: cookie ? { cookie } : {},
      })
    );
  }

  it('rejects an anonymous request', async () => {
    const response = await get();
    const body = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHENTICATED');
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it('returns the profile and role permissions for a valid session', async () => {
    prismaMock.user.findUnique.mockResolvedValue(userRow({ role: 'MANAGER' }));

    const response = await get(`${SESSION_COOKIE}=${await signSession(USER_ID)}`);
    const body = (await response.json()) as {
      data: { user: { id: string }; permissions: { can_view_team: boolean; can_manage_users: boolean } };
    };

    expect(response.status).toBe(200);
    expect(body.data.user.id).toBe(USER_ID);
    expect(body.data.permissions).toEqual({
      can_view_team: true,
      can_manage_users: false,
      can_report_on_others: true,
    });
  });

  it('answers 403 ACCOUNT_DEACTIVATED for a still-valid cookie on a disabled account', async () => {
    prismaMock.user.findUnique.mockResolvedValue(userRow({ isActive: false }));

    const response = await get(`${SESSION_COOKIE}=${await signSession(USER_ID)}`);
    const body = (await response.json()) as { error?: { code?: string } };

    expect(response.status).toBe(403);
    expect(body.error?.code).toBe('ACCOUNT_DEACTIVATED');
  });

  it('answers 401 when the cookie names a user who no longer exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const response = await get(`${SESSION_COOKIE}=${await signSession(USER_ID)}`);
    const body = (await response.json()) as { error?: { code?: string } };

    expect(response.status).toBe(401);
    expect(body.error?.code).toBe('UNAUTHENTICATED');
  });

  it('ignores a forged cookie without hitting the database', async () => {
    const response = await get(`${SESSION_COOKIE}=forged.token.value`);

    expect(response.status).toBe(401);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });
});
