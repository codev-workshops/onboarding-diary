/**
 * Report request validation. The date rules matter more than they look: the
 * range is the only thing bounding how much of somebody's diary one request can
 * pull, so "366 days" is a limit, not a preference.
 */
import { describe, expect, it } from 'vitest';

import { expandSections, reportRequestSchema } from '@/src/modules/reports/schemas';

const base = {
  scope_type: 'SELF' as const,
  date_from: '2026-01-01',
  date_to: '2026-01-31',
  sections: ['TASKS'],
};

const parse = (overrides: Record<string, unknown> = {}) =>
  reportRequestSchema.safeParse({ ...base, ...overrides });

const messages = (result: ReturnType<typeof parse>) =>
  result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));

describe('reportRequestSchema', () => {
  it('accepts a minimal self report and defaults the optional flags', () => {
    const result = parse();
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.include_summary).toBe(true);
      expect(result.data.include_details).toBe(true);
      expect(result.data.format).toBe('JSON');
    }
  });

  it('rejects an inverted range', () => {
    expect(messages(parse({ date_from: '2026-02-01', date_to: '2026-01-01' }))).toContain('date_to');
  });

  it('accepts exactly 366 days and refuses 367', () => {
    expect(parse({ date_from: '2025-01-01', date_to: '2025-12-31' }).success).toBe(true);
    expect(messages(parse({ date_from: '2025-01-01', date_to: '2026-01-02' }))).toContain('date_from');
  });

  it('accepts a single day and an empty-but-legal range', () => {
    expect(parse({ date_from: '2026-01-01', date_to: '2026-01-01' }).success).toBe(true);
  });

  it('requires exactly one user for a single-user report', () => {
    expect(messages(parse({ scope_type: 'USER' }))).toContain('user_ids');
    expect(
      messages(parse({ scope_type: 'USER', user_ids: ['11111111-1111-4111-8111-111111111111'] }))
    ).toEqual([]);
  });

  it('refuses more than fifty users', () => {
    const ids = Array.from(
      { length: 51 },
      (_, index) => `11111111-1111-4111-8111-${String(index).padStart(12, '0')}`
    );
    expect(messages(parse({ scope_type: 'USERS', user_ids: ids }))).toContain('user_ids');
  });

  it('refuses user ids on scopes that do not name users', () => {
    expect(
      messages(parse({ scope_type: 'ORG', user_ids: ['11111111-1111-4111-8111-111111111111'] }))
    ).toContain('user_ids');
  });

  it('requires a department for a department report', () => {
    expect(messages(parse({ scope_type: 'DEPARTMENT' }))).toContain('department_id');
  });

  it('refuses a report with neither summary nor details', () => {
    expect(messages(parse({ include_summary: false, include_details: false }))).toContain('include_details');
  });

  it('refuses unknown fields rather than ignoring them', () => {
    expect(parse({ group_by: 'USER' }).success).toBe(false);
  });
});

describe('expandSections', () => {
  it('keeps an explicit notes request so the policy can refuse it', () => {
    expect(expandSections(['NOTES'], false)).toEqual(['NOTES']);
  });

  it('drops notes from a combined report the caller may not read', () => {
    expect(expandSections(['COMBINED'], false)).toEqual(['TASKS', 'ISSUES', 'FEEDBACK']);
    expect(expandSections(['COMBINED'], true)).toEqual(['TASKS', 'ISSUES', 'FEEDBACK', 'NOTES']);
  });

  it('de-duplicates and orders sections consistently', () => {
    expect(expandSections(['ISSUES', 'TASKS', 'ISSUES'], true)).toEqual(['TASKS', 'ISSUES']);
  });
});
