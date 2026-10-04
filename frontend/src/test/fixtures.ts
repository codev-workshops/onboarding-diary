import type { Page, Task } from '../api/diaryTypes';
import type { User } from '../api/types';
import { todayIso } from '../utils/dates';

export const recruit: User = {
  id: 1,
  email: 'asha@example.com',
  roles: ['RECRUIT'],
  mustChangePassword: false,
  profile: {
    fullName: 'Asha Recruit',
    jobTitle: null,
    department: 'Engineering',
    startDate: '2026-01-05',
    managerId: null,
    managerEmail: null,
    managerName: null,
  },
};

export function page<T>(content: T[], totalPages = 1): Page<T> {
  return { content, page: 0, size: 20, totalElements: content.length, totalPages };
}

export function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    entryDate: todayIso(),
    title: 'Set up laptop',
    description: null,
    category: 'SETUP',
    status: 'TODO',
    priority: 'MEDIUM',
    completedAt: null,
    createdAt: '2026-01-05T09:00:00Z',
    updatedAt: '2026-01-05T09:00:00Z',
    version: 0,
    ...overrides,
  };
}
