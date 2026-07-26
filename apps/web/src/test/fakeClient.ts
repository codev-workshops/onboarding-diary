import { vi } from 'vitest';

import type {
  FeedbackNoteDto,
  IssueEntryDto,
  NoteDto,
  PaginatedEnvelope,
  Role,
  TaskEntryDto,
  UserDto,
} from '@onboarding-diary/shared';

import type { ApiClient, RequestOptions } from '../lib/apiClient.js';

export const RECRUIT: UserDto = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'nadia@example.com',
  fullName: 'Nadia Khan',
  role: 'RECRUIT',
  department: 'Engineering',
  startDate: '2026-07-01',
  managerId: null,
  isActive: true,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

export function userFixture(overrides: Partial<UserDto> & { role?: Role } = {}): UserDto {
  return { ...RECRUIT, ...overrides };
}

export const MANAGER = userFixture({
  id: '22222222-2222-4222-8222-222222222222',
  email: 'marcus@example.com',
  fullName: 'Marcus Lee',
  role: 'MANAGER',
});

export const ADMIN = userFixture({
  id: '33333333-3333-4333-8333-333333333333',
  email: 'priya@example.com',
  fullName: 'Priya Rao',
  role: 'ADMIN',
});

/** A one-page envelope, or a page of a longer list when `total` is supplied. */
export function page<T>(
  data: T[],
  meta: { total?: number; page?: number } = {},
): PaginatedEnvelope<T> {
  return {
    data,
    meta: {
      page: meta.page ?? 1,
      pageSize: 20,
      total: meta.total ?? data.length,
    },
  };
}

export function taskFixture(overrides: Partial<TaskEntryDto> = {}): TaskEntryDto {
  return {
    id: 'aaaaaaaa-0000-4000-8000-000000000001',
    ownerId: RECRUIT.id,
    entryDate: '2026-07-20',
    title: 'Set up the laptop',
    description: null,
    category: 'SETUP',
    status: 'DONE',
    priority: 'HIGH',
    createdAt: '2026-07-20T09:00:00.000Z',
    updatedAt: '2026-07-20T09:00:00.000Z',
    ...overrides,
  };
}

export function issueFixture(overrides: Partial<IssueEntryDto> = {}): IssueEntryDto {
  return {
    id: 'bbbbbbbb-0000-4000-8000-000000000001',
    ownerId: RECRUIT.id,
    entryDate: '2026-07-21',
    title: 'VPN keeps dropping',
    description: null,
    severity: 'HIGH',
    status: 'OPEN',
    resolutionNotes: null,
    createdAt: '2026-07-21T09:00:00.000Z',
    updatedAt: '2026-07-21T09:00:00.000Z',
    ...overrides,
  };
}

export function feedbackFixture(overrides: Partial<FeedbackNoteDto> = {}): FeedbackNoteDto {
  return {
    id: 'cccccccc-0000-4000-8000-000000000001',
    ownerId: RECRUIT.id,
    entryDate: '2026-07-22',
    subject: 'Great onboarding buddy',
    type: 'POSITIVE',
    details: null,
    createdAt: '2026-07-22T09:00:00.000Z',
    updatedAt: '2026-07-22T09:00:00.000Z',
    ...overrides,
  };
}

export function noteFixture(overrides: Partial<NoteDto> = {}): NoteDto {
  return {
    id: 'dddddddd-0000-4000-8000-000000000001',
    ownerId: RECRUIT.id,
    entryDate: '2026-07-23',
    title: 'Deploy runbook',
    content: null,
    tags: ['deploy', 'runbook'],
    createdAt: '2026-07-23T09:00:00.000Z',
    updatedAt: '2026-07-23T09:00:00.000Z',
    ...overrides,
  };
}

export type Handlers = {
  get?: (path: string, options?: RequestOptions) => unknown;
  post?: (path: string, body?: unknown, options?: RequestOptions) => unknown;
  patch?: (path: string, body?: unknown, options?: RequestOptions) => unknown;
  del?: (path: string, options?: RequestOptions) => void;
  download?: (path: string, body: unknown, fallbackFilename: string) => unknown;
};

export type FakeClient = ApiClient & {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
  download: ReturnType<typeof vi.fn>;
  refresh: ReturnType<typeof vi.fn>;
  setAccessToken: ReturnType<typeof vi.fn>;
};

/**
 * An `ApiClient` whose session starts either restored (a live refresh cookie) or anonymous.
 * Handlers stand in for the endpoints a test exercises; anything unhandled throws so a missing
 * expectation surfaces instead of silently resolving to `undefined`.
 */
export function fakeClient({
  session = null,
  handlers = {},
}: { session?: UserDto | null; handlers?: Handlers } = {}): FakeClient {
  const client = {
    request: vi.fn(),
    get: vi.fn(async (path: string, options?: RequestOptions) => {
      if (path === '/auth/me' && session !== null) return { data: session };
      const handled = handlers.get?.(path, options);
      if (handled !== undefined) return handled;
      throw new Error(`Unexpected GET ${path}`);
    }),
    post: vi.fn(async (path: string, body?: unknown, options?: RequestOptions) => {
      const handled = handlers.post?.(path, body, options);
      return handled === undefined ? { data: {} } : handled;
    }),
    patch: vi.fn(async (path: string, body?: unknown, options?: RequestOptions) => {
      const handled = handlers.patch?.(path, body, options);
      return handled === undefined ? { data: {} } : handled;
    }),
    del: vi.fn(async (path: string, options?: RequestOptions) => {
      handlers.del?.(path, options);
    }),
    download: vi.fn(async (path: string, body: unknown, fallbackFilename: string) => {
      const handled = handlers.download?.(path, body, fallbackFilename);
      if (handled !== undefined) return handled;
      throw new Error(`Unexpected download ${path}`);
    }),
    refresh: vi.fn(async () => session !== null),
    setAccessToken: vi.fn(),
  };
  return client as unknown as FakeClient;
}
