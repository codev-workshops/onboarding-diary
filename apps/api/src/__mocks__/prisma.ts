import { vi } from 'vitest';

function createMockModel() {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  };
}

export const prismaMock = {
  user: createMockModel(),
  recruitProfile: createMockModel(),
  refreshToken: createMockModel(),
  taskEntry: createMockModel(),
  issueEntry: createMockModel(),
  feedbackEntry: createMockModel(),
  noteEntry: createMockModel(),
  report: createMockModel(),
  managerRecruitRelationship: createMockModel(),
  $transaction: vi.fn((input: unknown) => {
    if (typeof input === 'function') return input(prismaMock);
    if (Array.isArray(input)) return Promise.all(input);
    return Promise.resolve(input);
  }),
  $queryRaw: vi.fn(),
};
