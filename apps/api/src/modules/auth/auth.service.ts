import { createHash, randomBytes } from 'node:crypto';
import type { RegisterSchema, LoginSchema, AuthResponse } from '@onboarding-diary/shared';
import { prisma } from '../../config/database.js';
import { config } from '../../config/index.js';
import { ConflictError, UnauthorizedError } from '../../errors/AppError.js';
import { hashPassword, comparePassword } from '../../utils/hash.js';
import { signAccessToken } from '../../utils/jwt.js';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Parse a duration string like "15m", "7d", "2h" into milliseconds. */
function parseDurationMs(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // fallback: 7 days
  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return value * (multipliers[unit] ?? 86_400_000);
}

/** Parse an access token expiry string like "15m" into seconds for the API response. */
function parseExpirySeconds(duration: string): number {
  return Math.floor(parseDurationMs(duration) / 1000);
}

function buildUserPayload(user: { id: string; email: string; firstName: string; lastName: string; role: string }) {
  return {
    id: user.id,
    email: user.email,
    first_name: user.firstName,
    last_name: user.lastName,
    role: user.role,
  };
}

async function createRefreshToken(userId: string): Promise<string> {
  const refreshToken = randomBytes(64).toString('base64url');
  const refreshExpiresMs = parseDurationMs(config.JWT_REFRESH_EXPIRY);

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + refreshExpiresMs),
    },
  });

  return refreshToken;
}

export async function register(input: RegisterSchema): Promise<AuthResponse> {
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) {
    throw new ConflictError('Email is already registered');
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash,
      firstName: input.first_name,
      lastName: input.last_name,
      recruitProfile: input.department
        ? { create: { department: input.department } }
        : undefined,
    },
  });

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = await createRefreshToken(user.id);

  return {
    data: buildUserPayload(user),
    tokens: {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: parseExpirySeconds(config.JWT_ACCESS_EXPIRY),
    },
  };
}

export async function login(input: LoginSchema): Promise<AuthResponse> {
  const user = await prisma.user.findUnique({
    where: { email: input.email.toLowerCase(), deletedAt: null },
  });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  if (user.status !== 'ACTIVE') {
    throw new UnauthorizedError('Account is not active', 'UNAUTHORIZED');
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = randomBytes(64).toString('base64url');
  const refreshExpiresMs = parseDurationMs(config.JWT_REFRESH_EXPIRY);

  await prisma.$transaction([
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshExpiresMs),
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
  ]);

  return {
    data: buildUserPayload(user),
    tokens: {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: parseExpirySeconds(config.JWT_ACCESS_EXPIRY),
    },
  };
}

export async function refreshTokens(token: string) {
  const tokenHash = hashToken(token);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user || user.deletedAt) {
    throw new UnauthorizedError('User not found');
  }

  const newRefreshToken = randomBytes(64).toString('base64url');
  const refreshExpiresMs = parseDurationMs(config.JWT_REFRESH_EXPIRY);

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    }),
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(newRefreshToken),
        expiresAt: new Date(Date.now() + refreshExpiresMs),
      },
    }),
  ]);

  const accessToken = signAccessToken({ sub: user.id, role: user.role });

  return {
    tokens: {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      expires_in: parseExpirySeconds(config.JWT_ACCESS_EXPIRY),
    },
  };
}

export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    include: { recruitProfile: true },
  });

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  return {
    data: {
      id: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      avatar_url: user.avatarUrl,
      role: user.role,
      status: user.status,
      created_at: user.createdAt.toISOString(),
      ...(user.recruitProfile
        ? {
            recruit_profile: {
              department: user.recruitProfile.department,
              position: user.recruitProfile.position,
              start_date: user.recruitProfile.startDate?.toISOString() ?? null,
              expected_end_date: user.recruitProfile.expectedEndDate?.toISOString() ?? null,
              bio: user.recruitProfile.bio,
              onboarding_status: user.recruitProfile.onboardingStatus,
            },
          }
        : {}),
    },
  };
}

export async function logout(refreshToken: string, userId: string) {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, userId },
    data: { revokedAt: new Date() },
  });
}
