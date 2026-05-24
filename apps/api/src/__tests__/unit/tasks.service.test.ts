import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../../__mocks__/prisma.js';
import { createMockTask, testUsers } from '../helpers.js';
import { Role, Priority, Visibility, TaskStatus } from '@onboarding-diary/shared';

vi.mock('../../config/database.js', () => ({
  prisma: prismaMock,
}));

// Must import after mock
const { createTask, updateTask, deleteTask, getTaskById } = await import(
  '../../modules/tasks/tasks.service.js'
);

describe('Tasks Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTask', () => {
    it('should create a task and return DTO', async () => {
      const mockTask = createMockTask();
      prismaMock.taskEntry.create.mockResolvedValue(mockTask);

      const result = await createTask(testUsers.recruit.id, {
        title: 'Test Task',
        description: 'A test task description',
        priority: Priority.MEDIUM,
        visibility: Visibility.MANAGER_ONLY,
        tags: ['test'],
      });

      expect(result.id).toBe('task-001');
      expect(result.title).toBe('Test Task');
      expect(result.user_id).toBe(testUsers.recruit.id);
      expect(result.status).toBe('PENDING');
      expect(prismaMock.taskEntry.create).toHaveBeenCalledOnce();
    });

    it('should handle optional fields correctly', async () => {
      const mockTask = createMockTask({ description: null, tags: [] });
      prismaMock.taskEntry.create.mockResolvedValue(mockTask);

      const result = await createTask(testUsers.recruit.id, {
        title: 'Minimal Task',
        priority: Priority.MEDIUM,
        visibility: Visibility.MANAGER_ONLY,
      });

      expect(result.description).toBeNull();
      expect(result.tags).toEqual([]);
    });
  });

  describe('updateTask', () => {
    it('should allow owner to update their task', async () => {
      const existing = createMockTask();
      prismaMock.taskEntry.findUnique.mockResolvedValue(existing);
      prismaMock.taskEntry.update.mockResolvedValue({
        ...existing,
        title: 'Updated Title',
      });

      const result = await updateTask(
        'task-001',
        { title: 'Updated Title' },
        testUsers.recruit.id,
        Role.RECRUIT,
      );

      expect(result.title).toBe('Updated Title');
    });

    it('should allow ADMIN to update any task', async () => {
      const existing = createMockTask();
      prismaMock.taskEntry.findUnique.mockResolvedValue(existing);
      prismaMock.taskEntry.update.mockResolvedValue({
        ...existing,
        title: 'Admin Update',
      });

      const result = await updateTask(
        'task-001',
        { title: 'Admin Update' },
        testUsers.admin.id,
        Role.ADMIN,
      );

      expect(result.title).toBe('Admin Update');
    });

    it('should set completedAt when status changes to COMPLETED', async () => {
      const existing = createMockTask();
      prismaMock.taskEntry.findUnique.mockResolvedValue(existing);
      prismaMock.taskEntry.update.mockResolvedValue({
        ...existing,
        status: 'COMPLETED',
        completedAt: new Date(),
      });

      await updateTask(
        'task-001',
        { status: TaskStatus.COMPLETED },
        testUsers.recruit.id,
        Role.RECRUIT,
      );

      const updateCall = prismaMock.taskEntry.update.mock.calls[0]![0] as { data: Record<string, unknown> };
      expect(updateCall.data.status).toBe('COMPLETED');
      expect(updateCall.data.completedAt).toBeInstanceOf(Date);
    });

    it('should clear completedAt when status changes away from COMPLETED', async () => {
      const existing = createMockTask({ status: 'COMPLETED', completedAt: new Date() });
      prismaMock.taskEntry.findUnique.mockResolvedValue(existing);
      prismaMock.taskEntry.update.mockResolvedValue({
        ...existing,
        status: 'IN_PROGRESS',
        completedAt: null,
      });

      await updateTask(
        'task-001',
        { status: TaskStatus.IN_PROGRESS },
        testUsers.recruit.id,
        Role.RECRUIT,
      );

      const updateCall = prismaMock.taskEntry.update.mock.calls[0]![0] as { data: Record<string, unknown> };
      expect(updateCall.data.completedAt).toBeNull();
    });

    it('should throw ForbiddenError for non-owner non-admin', async () => {
      const existing = createMockTask();
      prismaMock.taskEntry.findUnique.mockResolvedValue(existing);

      await expect(
        updateTask('task-001', { title: 'Hack' }, testUsers.manager.id, Role.MANAGER),
      ).rejects.toThrow('You can only edit your own tasks');
    });

    it('should throw NotFoundError for missing task', async () => {
      prismaMock.taskEntry.findUnique.mockResolvedValue(null);

      await expect(
        updateTask('nonexistent', { title: 'X' }, testUsers.recruit.id, Role.RECRUIT),
      ).rejects.toThrow();
    });
  });

  describe('deleteTask', () => {
    it('should soft-delete a task by owner', async () => {
      const existing = createMockTask();
      prismaMock.taskEntry.findUnique.mockResolvedValue(existing);
      prismaMock.taskEntry.update.mockResolvedValue({ ...existing, deletedAt: new Date() });

      await deleteTask('task-001', testUsers.recruit.id, Role.RECRUIT);

      expect(prismaMock.taskEntry.update).toHaveBeenCalledWith({
        where: { id: 'task-001' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should allow ADMIN to delete any task', async () => {
      const existing = createMockTask();
      prismaMock.taskEntry.findUnique.mockResolvedValue(existing);
      prismaMock.taskEntry.update.mockResolvedValue({ ...existing, deletedAt: new Date() });

      await deleteTask('task-001', testUsers.admin.id, Role.ADMIN);

      expect(prismaMock.taskEntry.update).toHaveBeenCalled();
    });

    it('should throw ForbiddenError for non-owner non-admin', async () => {
      const existing = createMockTask();
      prismaMock.taskEntry.findUnique.mockResolvedValue(existing);

      await expect(
        deleteTask('task-001', testUsers.manager.id, Role.MANAGER),
      ).rejects.toThrow('You can only delete your own tasks');
    });
  });

  describe('getTaskById', () => {
    it('should return task for owner', async () => {
      const mockTask = createMockTask();
      prismaMock.taskEntry.findUnique.mockResolvedValue(mockTask);

      const result = await getTaskById('task-001', testUsers.recruit.id, Role.RECRUIT);
      expect(result.id).toBe('task-001');
    });

    it('should return task for ADMIN', async () => {
      const mockTask = createMockTask();
      prismaMock.taskEntry.findUnique.mockResolvedValue(mockTask);

      const result = await getTaskById('task-001', testUsers.admin.id, Role.ADMIN);
      expect(result.id).toBe('task-001');
    });

    it('should allow manager to view assigned recruit\'s non-private tasks', async () => {
      const mockTask = createMockTask({ visibility: 'MANAGER_ONLY' });
      prismaMock.taskEntry.findUnique.mockResolvedValue(mockTask);
      prismaMock.managerRecruitRelationship.findFirst.mockResolvedValue({ id: 'rel-1' });

      const result = await getTaskById('task-001', testUsers.manager.id, Role.MANAGER);
      expect(result.id).toBe('task-001');
    });

    it('should deny manager access to private tasks', async () => {
      const mockTask = createMockTask({ visibility: 'PRIVATE' });
      prismaMock.taskEntry.findUnique.mockResolvedValue(mockTask);
      prismaMock.managerRecruitRelationship.findFirst.mockResolvedValue({ id: 'rel-1' });

      await expect(
        getTaskById('task-001', testUsers.manager.id, Role.MANAGER),
      ).rejects.toThrow('You do not have permission');
    });

    it('should throw NotFoundError for missing task', async () => {
      prismaMock.taskEntry.findUnique.mockResolvedValue(null);

      await expect(
        getTaskById('nonexistent', testUsers.recruit.id, Role.RECRUIT),
      ).rejects.toThrow();
    });
  });
});
