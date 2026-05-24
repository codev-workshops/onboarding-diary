import jwt, { type SignOptions } from 'jsonwebtoken';

const ACCESS_SECRET = 'test-access-secret-that-is-at-least-32-chars-long';

export function createTestToken(
  user: { id: string; role: string },
  expiresIn = '15m',
): string {
  const opts: SignOptions = { expiresIn: expiresIn as SignOptions['expiresIn'] };
  return jwt.sign({ sub: user.id, role: user.role }, ACCESS_SECRET, opts);
}

export const testUsers = {
  admin: {
    id: 'a1b2c3d4-0000-0000-0000-000000000001',
    email: 'admin@test.local',
    first_name: 'Test',
    last_name: 'Admin',
    role: 'ADMIN',
  },
  manager: {
    id: 'a1b2c3d4-0000-0000-0000-000000000002',
    email: 'manager@test.local',
    first_name: 'Test',
    last_name: 'Manager',
    role: 'MANAGER',
  },
  recruit: {
    id: 'a1b2c3d4-0000-0000-0000-000000000003',
    email: 'recruit@test.local',
    first_name: 'Test',
    last_name: 'Recruit',
    role: 'RECRUIT',
  },
} as const;

export function adminToken() {
  return createTestToken(testUsers.admin);
}

export function managerToken() {
  return createTestToken(testUsers.manager);
}

export function recruitToken() {
  return createTestToken(testUsers.recruit);
}

export function createMockTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-001',
    userId: testUsers.recruit.id,
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

export function createMockIssue(overrides: Record<string, unknown> = {}) {
  return {
    id: 'issue-001',
    userId: testUsers.recruit.id,
    title: 'Test Issue',
    description: 'A test issue description',
    severity: 'MEDIUM',
    status: 'OPEN',
    visibility: 'MANAGER_ONLY',
    resolutionNote: null,
    resolvedAt: null,
    tags: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
    ...overrides,
  };
}

export function createMockNote(overrides: Record<string, unknown> = {}) {
  return {
    id: 'note-001',
    userId: testUsers.recruit.id,
    title: 'Test Note',
    body: 'Some note content here',
    visibility: 'PRIVATE',
    moodRating: 4,
    entryDate: new Date('2026-01-01'),
    tags: ['reflection'],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
    ...overrides,
  };
}

export function createMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: testUsers.recruit.id,
    email: testUsers.recruit.email,
    passwordHash: '$2a$04$hashedpassword',
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
