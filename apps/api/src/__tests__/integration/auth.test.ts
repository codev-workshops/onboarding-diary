import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';

// Mock database before importing app
vi.mock('../../config/database.js', async () => {
  const { prismaMock } = await import('../../__mocks__/prisma.js');
  return { prisma: prismaMock };
});

const { prismaMock } = await import('../../__mocks__/prisma.js');
const { app } = await import('../../app.js');

function createMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'a1b2c3d4-0000-0000-0000-000000000003',
    email: 'recruit@test.local',
    passwordHash: '$2a$04$hash',
    firstName: 'Test',
    lastName: 'Recruit',
    role: 'RECRUIT',
    status: 'ACTIVE',
    avatarUrl: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
    ...overrides,
  };
}

function createTestToken() {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { sub: 'a1b2c3d4-0000-0000-0000-000000000001', role: 'ADMIN' },
    'test-access-secret-that-is-at-least-32-chars-long',
    { expiresIn: '15m' },
  );
}

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      prismaMock.user.create.mockResolvedValue({
        ...createMockUser({
          id: 'new-user-id',
          email: 'new@test.local',
          firstName: 'New',
          lastName: 'User',
        }),
        recruitProfile: { department: 'Engineering', position: null, startDate: null, expectedEndDate: null, bio: null, onboardingStatus: 'NOT_STARTED' },
      });
      prismaMock.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'new@test.local',
          password: 'Password1!',
          first_name: 'New',
          last_name: 'User',
          department: 'Engineering',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('tokens');
      expect(res.body.tokens).toHaveProperty('access_token');
      expect(res.body.tokens).toHaveProperty('refresh_token');
    });

    it('should reject duplicate email', async () => {
      prismaMock.user.findUnique.mockResolvedValue(createMockUser());

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'recruit@test.local',
          password: 'Password1!',
          first_name: 'Test',
          last_name: 'User',
        });

      expect(res.status).toBe(409);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'bad' });

      expect(res.status).toBe(400);
    });

    it('should enforce password complexity', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'new@test.local',
          password: 'weak',
          first_name: 'Test',
          last_name: 'User',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const hashedPw = await bcrypt.hash('Password1!', 4);
      prismaMock.user.findUnique.mockResolvedValue(
        createMockUser({ passwordHash: hashedPw, status: 'ACTIVE' }),
      );
      prismaMock.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'recruit@test.local', password: 'Password1!' });

      expect(res.status).toBe(200);
      expect(res.body.tokens).toHaveProperty('access_token');
    });

    it('should reject wrong password', async () => {
      const hashedPw = await bcrypt.hash('Password1!', 4);
      prismaMock.user.findUnique.mockResolvedValue(
        createMockUser({ passwordHash: hashedPw }),
      );

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'recruit@test.local', password: 'WrongPassword1!' });

      expect(res.status).toBe(401);
    });

    it('should reject non-existent user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'noone@test.local', password: 'Password1!' });

      expect(res.status).toBe(401);
    });

    it('should reject inactive users', async () => {
      const hashedPw = await bcrypt.hash('Password1!', 4);
      prismaMock.user.findUnique.mockResolvedValue(
        createMockUser({ passwordHash: hashedPw, status: 'INACTIVE' }),
      );

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'recruit@test.local', password: 'Password1!' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user for authenticated request', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...createMockUser({
          id: 'a1b2c3d4-0000-0000-0000-000000000001',
          email: 'admin@test.local',
          firstName: 'Test',
          lastName: 'Admin',
          role: 'ADMIN',
        }),
        recruitProfile: null,
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${createTestToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('email', 'admin@test.local');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      prismaMock.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${createTestToken()}`)
        .send({ refresh_token: 'some-valid-refresh-token' });

      expect(res.status).toBe(204);
    });

    it('should reject logout without refresh_token in body', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${createTestToken()}`)
        .send({});

      expect(res.status).toBe(400);
    });

    it('should reject logout without auth', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .send({ refresh_token: 'token' });

      expect(res.status).toBe(401);
    });
  });
});
