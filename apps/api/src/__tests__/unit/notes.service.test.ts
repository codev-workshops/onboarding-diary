import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../../__mocks__/prisma.js';
import { createMockNote, testUsers } from '../helpers.js';
import { Role, Visibility } from '@onboarding-diary/shared';

vi.mock('../../config/database.js', () => ({
  prisma: prismaMock,
}));

const { createNote, updateNote, deleteNote, getNoteById } = await import(
  '../../modules/notes/notes.service.js'
);

describe('Notes Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createNote', () => {
    it('should create a note and return DTO', async () => {
      const mockNote = createMockNote();
      prismaMock.noteEntry.create.mockResolvedValue(mockNote);

      const result = await createNote(testUsers.recruit.id, {
        title: 'Test Note',
        body: 'Some note content here',
        visibility: Visibility.PRIVATE,
        mood_rating: 4,
        entry_date: '2026-01-01',
        tags: ['reflection'],
      });

      expect(result.id).toBe('note-001');
      expect(result.title).toBe('Test Note');
      expect(result.mood_rating).toBe(4);
      expect(prismaMock.noteEntry.create).toHaveBeenCalledOnce();
    });
  });

  describe('updateNote', () => {
    it('should allow owner to update', async () => {
      const existing = createMockNote();
      prismaMock.noteEntry.findUnique.mockResolvedValue(existing);
      prismaMock.noteEntry.update.mockResolvedValue({ ...existing, title: 'Updated' });

      const result = await updateNote(
        'note-001',
        { title: 'Updated' },
        testUsers.recruit.id,
        Role.RECRUIT,
      );

      expect(result.title).toBe('Updated');
    });

    it('should throw ForbiddenError for non-owner non-admin', async () => {
      const existing = createMockNote();
      prismaMock.noteEntry.findUnique.mockResolvedValue(existing);

      await expect(
        updateNote('note-001', { title: 'X' }, testUsers.manager.id, Role.MANAGER),
      ).rejects.toThrow();
    });
  });

  describe('deleteNote', () => {
    it('should soft-delete note by owner', async () => {
      const existing = createMockNote();
      prismaMock.noteEntry.findUnique.mockResolvedValue(existing);
      prismaMock.noteEntry.update.mockResolvedValue({ ...existing, deletedAt: new Date() });

      await deleteNote('note-001', testUsers.recruit.id, Role.RECRUIT);
      expect(prismaMock.noteEntry.update).toHaveBeenCalled();
    });
  });

  describe('getNoteById', () => {
    it('should return note for owner', async () => {
      prismaMock.noteEntry.findUnique.mockResolvedValue(createMockNote());

      const result = await getNoteById('note-001', testUsers.recruit.id, Role.RECRUIT);
      expect(result.id).toBe('note-001');
    });

    it('should throw for missing note', async () => {
      prismaMock.noteEntry.findUnique.mockResolvedValue(null);

      await expect(
        getNoteById('nonexistent', testUsers.recruit.id, Role.RECRUIT),
      ).rejects.toThrow();
    });
  });
});
