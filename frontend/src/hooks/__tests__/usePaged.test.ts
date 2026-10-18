import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { usePaged } from '../usePaged';

afterEach(() => {
  vi.restoreAllMocks();
});

test('ignores a slow response for an older query', async () => {
  const resolvers = new Map<string, (r: Response) => void>();
  vi.spyOn(globalThis, 'fetch').mockImplementation(
    (input) => new Promise<Response>((resolve) => resolvers.set(String(input), resolve)),
  );
  const pageOf = (title: string) =>
    new Response(
      JSON.stringify({ content: [{ title }], page: 0, size: 20, totalElements: 1, totalPages: 1 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );

  const { result, rerender } = renderHook(({ q }) => usePaged<{ title: string }>('/api/tasks', new URLSearchParams(q)), {
    initialProps: { q: 'status=TODO' },
  });
  rerender({ q: 'status=DONE' });
  await waitFor(() => expect(resolvers.size).toBe(2));

  resolvers.get('/api/tasks?status=DONE')!(pageOf('done task'));
  await waitFor(() => expect(result.current.data?.content[0].title).toBe('done task'));
  resolvers.get('/api/tasks?status=TODO')!(pageOf('todo task'));
  await new Promise((r) => setTimeout(r, 20));

  expect(result.current.data?.content[0].title).toBe('done task');
  expect(result.current.loading).toBe(false);
});
