import { describe, expect, it } from 'vitest';

import { safeRedirectPath } from '@/src/shared/http/safe-path';

describe('safeRedirectPath', () => {
  it('keeps a same-origin path, query string and all', () => {
    expect(safeRedirectPath('/tasks?status=OPEN')).toBe('/tasks?status=OPEN');
  });

  it.each([
    ['//evil.example', 'protocol-relative'],
    ['/\\evil.example', 'backslash protocol-relative'],
    ['https://evil.example', 'absolute'],
    ['javascript:alert(1)', 'scheme'],
    ['', 'empty'],
    [null, 'absent'],
  ])('falls back for %s, a %s target', (value: string | null, _kind: string) => {
    expect(safeRedirectPath(value)).toBe('/dashboard');
  });
});
