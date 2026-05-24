import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../../config/database.js', async () => {
  const { prismaMock } = await import('../../__mocks__/prisma.js');
  return { prisma: prismaMock };
});

const { prismaMock } = await import('../../__mocks__/prisma.js');
const { app } = await import('../../app.js');

const SECRET = 'test-access-secret-that-is-at-least-32-chars-long';

const recruitId = 'a1b2c3d4-0000-0000-0000-000000000003';
const adminId = 'a1b2c3d4-0000-0000-0000-000000000001';
const managerId = 'a1b2c3d4-0000-0000-0000-000000000002';

function token(sub: string, role: string) {
  return jwt.sign({ sub, role }, SECRET, { expiresIn: '15m' });
}

function mockTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-001',
    userId: recruitId,
    title: 'Test Task',
    description: 'A test task description',
    priority: 'MEDIUM',
    status: 'PENDING',
    dueDate: null,
    completedAt: null,
    visibility: 'MANAGER_ONLY',
    tags: ['test'],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
    ...overrides,
  };
}

describe('Tasks API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/tasks', () => {
    it('should create a task when authenticated', async () => {
      prismaMock.taskEntry.create.mockResolvedValue(mockTask());

      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${token(recruitId, 'RECRUIT')}`)
        .send({ title: 'Test Task', description: 'Test description' });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id', 'task-001');
      expect(res.body.data).toHaveProperty('title', 'Test Task');
    });

    it('should reject unauthenticated requests', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .send({ title: 'Test Task' });

      expect(res.status).toBe(401);
    });

    it('should validate title is required', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${token(recruitId, 'RECRUIT')}`)
        .send({ description: 'No title' });

      expect(res.status).toBe(400);
    });

    it('should validate title minimum length', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${token(recruitId, 'RECRUIT')}`)
        .send({ title: 'ab' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/tasks/:id', () => {
    it('should return a task for the owner', async () => {
      prismaMock.taskEntry.findUnique.mockResolvedValue(mockTask());

      const res = await request(app)
        .get('/api/v1/tasks/task-001')
        .set('Authorization', `Bearer ${token(recruitId, 'RECRUIT')}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('id', 'task-001');
    });

    it('should return 404 for non-existent task', async () => {
      prismaMock.taskEntry.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/v1/tasks/nonexistent')
        .set('Authorization', `Bearer ${token(recruitId, 'RECRUIT')}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/tasks/:id', () => {
    it('should update task by owner', async () => {
      const existing = mockTask();
      prismaMock.taskEntry.findUnique.mockResolvedValue(existing);
      prismaMock.taskEntry.update.mockResolvedValue({ ...existing, title: 'Updated' });

      const res = await request(app)
        .patch('/api/v1/tasks/task-001')
        .set('Authorization', `Bearer ${token(recruitId, 'RECRUIT')}`)
        .send({ title: 'Updated' });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated');
    });

    it('should update task by admin', async () => {
      const existing = mockTask();
      prismaMock.taskEntry.findUnique.mockResolvedValue(existing);
      prismaMock.taskEntry.update.mockResolvedValue({ ...existing, title: 'Admin Updated' });

      const res = await request(app)
        .patch('/api/v1/tasks/task-001')
        .set('Authorization', `Bearer ${token(adminId, 'ADMIN')}`)
        .send({ title: 'Admin Updated' });

      expect(res.status).toBe(200);
    });

    it('should return 403 for non-owner manager', async () => {
      prismaMock.taskEntry.findUnique.mockResolvedValue(mockTask());

      const res = await request(app)
        .patch('/api/v1/tasks/task-001')
        .set('Authorization', `Bearer ${token(managerId, 'MANAGER')}`)
        .send({ title: 'Hack' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    it('should soft-delete task by owner', async () => {
      const existing = mockTask();
      prismaMock.taskEntry.findUnique.mockResolvedValue(existing);
      prismaMock.taskEntry.update.mockResolvedValue({ ...existing, deletedAt: new Date() });

      const res = await request(app)
        .delete('/api/v1/tasks/task-001')
        .set('Authorization', `Bearer ${token(recruitId, 'RECRUIT')}`);

      expect(res.status).toBe(204);
    });

    it('should return 403 for non-owner non-admin', async () => {
      prismaMock.taskEntry.findUnique.mockResolvedValue(mockTask());

      const res = await request(app)
        .delete('/api/v1/tasks/task-001')
        .set('Authorization', `Bearer ${token(managerId, 'MANAGER')}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/tasks', () => {
    it('should list tasks with pagination', async () => {
      const tasks = [mockTask({ id: 't1' }), mockTask({ id: 't2' })];
      prismaMock.taskEntry.findMany.mockResolvedValue(tasks);
      prismaMock.taskEntry.count.mockResolvedValue(2);

      const res = await request(app)
        .get('/api/v1/tasks?page=1&limit=20')
        .set('Authorization', `Bearer ${token(recruitId, 'RECRUIT')}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta).toHaveProperty('total_count', 2);
    });
  });
});
