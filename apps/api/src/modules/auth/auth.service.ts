import { createHash, randomBytes } from 'node:crypto';
import type { RegisterSchema, LoginSchema, AuthResponse } from '@onboarding-diary/shared';
import { prisma } from '../../config/database.js';
import { ConflictError, UnauthorizedError } from '../../errors/AppError.js';
import { hashPassword, comparePassword } from '../../utils/hash.js';
import { signAccessToken } from '../../utils/jwt.js';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
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
  const refreshToken = randomBytes(64).toString('base64url');

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  return {
    data: {
      id: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      role: user.role,
    },
    tokens: {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900,
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

  await prisma.$transaction([
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
  ]);

  return {
    data: {
      id: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      role: user.role,
    },
    tokens: {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900,
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

  await prisma.$transaction([
    prisma.refreshToken.update({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    }),
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(newRefreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  const accessToken = signAccessToken({ sub: user.id, role: user.role });

  return {
    tokens: {
      access_token: accessToken,
      refresh_token: newRefreshToken,
      expires_in: 900,
    },
  };
}

export async function logout(refreshToken: string, userId: string) {
  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, userId },
      data: { revokedAt: new Date() },
    });
  }
}
