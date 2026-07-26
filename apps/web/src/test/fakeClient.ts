import { vi } from 'vitest';

import type { ApiClient } from '../lib/apiClient.js';
import type { UserDto } from '@onboarding-diary/shared';

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

export type FakeClient = ApiClient & {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
  refresh: ReturnType<typeof vi.fn>;
  setAccessToken: ReturnType<typeof vi.fn>;
};

/** An `ApiClient` whose session starts either restored (a live refresh cookie) or anonymous. */
export function fakeClient({ session = null }: { session?: UserDto | null } = {}): FakeClient {
  const client = {
    request: vi.fn(),
    get: vi.fn(async (path: string) => {
      if (path === '/auth/me' && session !== null) return { data: session };
      throw new Error(`Unexpected GET ${path}`);
    }),
    post: vi.fn(async () => ({ data: {} })),
    patch: vi.fn(async () => ({ data: {} })),
    del: vi.fn(async () => undefined),
    refresh: vi.fn(async () => session !== null),
    setAccessToken: vi.fn(),
  };
  return client as unknown as FakeClient;
}
