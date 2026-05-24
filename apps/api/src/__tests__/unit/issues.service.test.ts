import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../../__mocks__/prisma.js';
import { createMockIssue, testUsers } from '../helpers.js';
import { Role, IssueSeverity, IssueStatus, Visibility } from '@onboarding-diary/shared';

vi.mock('../../config/database.js', () => ({
  prisma: prismaMock,
}));

const { createIssue, updateIssue, deleteIssue, getIssueById } = await import(
  '../../modules/issues/issues.service.js'
);

describe('Issues Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createIssue', () => {
    it('should create an issue and return DTO', async () => {
      const mockIssue = createMockIssue();
      prismaMock.issueEntry.create.mockResolvedValue(mockIssue);

      const result = await createIssue(testUsers.recruit.id, {
        title: 'Test Issue',
        description: 'A test issue description',
        severity: IssueSeverity.MEDIUM,
        visibility: Visibility.MANAGER_ONLY,
      });

      expect(result.id).toBe('issue-001');
      expect(result.title).toBe('Test Issue');
      expect(result.status).toBe('OPEN');
      expect(prismaMock.issueEntry.create).toHaveBeenCalledOnce();
    });
  });

  describe('updateIssue', () => {
    it('should allow owner to update their issue', async () => {
      const existing = createMockIssue();
      prismaMock.issueEntry.findUnique.mockResolvedValue(existing);
      prismaMock.issueEntry.update.mockResolvedValue({
        ...existing,
        title: 'Updated Issue',
      });

      const result = await updateIssue(
        'issue-001',
        { title: 'Updated Issue' },
        testUsers.recruit.id,
        Role.RECRUIT,
      );

      expect(result.title).toBe('Updated Issue');
    });

    it('should set resolvedAt when status changes to RESOLVED', async () => {
      const existing = createMockIssue();
      prismaMock.issueEntry.findUnique.mockResolvedValue(existing);
      prismaMock.issueEntry.update.mockResolvedValue({
        ...existing,
        status: 'RESOLVED',
        resolvedAt: new Date(),
      });

      await updateIssue(
        'issue-001',
        { status: IssueStatus.RESOLVED },
        testUsers.recruit.id,
        Role.RECRUIT,
      );

      const updateCall = prismaMock.issueEntry.update.mock.calls[0]![0] as { data: Record<string, unknown> };
      expect(updateCall.data.status).toBe('RESOLVED');
      expect(updateCall.data.resolvedAt).toBeInstanceOf(Date);
    });

    it('should throw ForbiddenError for non-owner non-admin', async () => {
      const existing = createMockIssue();
      prismaMock.issueEntry.findUnique.mockResolvedValue(existing);

      await expect(
        updateIssue('issue-001', { title: 'Hack' }, testUsers.manager.id, Role.MANAGER),
      ).rejects.toThrow();
    });
  });

  describe('deleteIssue', () => {
    it('should soft-delete issue by owner', async () => {
      const existing = createMockIssue();
      prismaMock.issueEntry.findUnique.mockResolvedValue(existing);
      prismaMock.issueEntry.update.mockResolvedValue({ ...existing, deletedAt: new Date() });

      await deleteIssue('issue-001', testUsers.recruit.id, Role.RECRUIT);

      expect(prismaMock.issueEntry.update).toHaveBeenCalledWith({
        where: { id: 'issue-001' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe('getIssueById', () => {
    it('should return issue for owner', async () => {
      const mockIssue = createMockIssue();
      prismaMock.issueEntry.findUnique.mockResolvedValue(mockIssue);

      const result = await getIssueById('issue-001', testUsers.recruit.id, Role.RECRUIT);
      expect(result.id).toBe('issue-001');
    });

    it('should throw NotFoundError for missing issue', async () => {
      prismaMock.issueEntry.findUnique.mockResolvedValue(null);

      await expect(
        getIssueById('nonexistent', testUsers.recruit.id, Role.RECRUIT),
      ).rejects.toThrow();
    });
  });
});
