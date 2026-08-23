/**
 * The audit-log filter contract (§12.8). The audit table is the one read that
 * spans every user, so the query string is held to the same strictness as a
 * write body: known fields only, typed ids, real dates, ordered ranges.
 */
import { describe, expect, it } from 'vitest';

import { auditLogQuerySchema } from '@/src/modules/audit/schemas';

const parse = (query: Record<string, string>) => auditLogQuerySchema.safeParse(query);

describe('auditLogQuerySchema', () => {
  it('defaults to the first page, newest first', () => {
    const parsed = auditLogQuerySchema.parse({});
    expect(parsed).toMatchObject({ page: 1, page_size: 20, order: 'desc' });
  });

  it('accepts the specified filters', () => {
    const parsed = auditLogQuerySchema.parse({
      actor_user_id: '11111111-1111-4111-8111-111111111111',
      target_user_id: '22222222-2222-4222-8222-222222222222',
      action: 'USER.ROLE_CHANGED',
      entity_type: 'USER',
      date_from: '2026-01-01',
      date_to: '2026-01-31',
    });

    expect(parsed.action).toBe('USER.ROLE_CHANGED');
    expect(parsed.date_from?.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it.each([
    ['a non-uuid actor', { actor_user_id: 'marcus' }],
    ['a non-uuid target', { target_user_id: 'not-a-uuid' }],
    ['a date that does not exist', { date_from: '2026-02-31' }],
    ['a reversed range', { date_from: '2026-02-02', date_to: '2026-02-01' }],
    ['an unknown field', { owner_id: '11111111-1111-4111-8111-111111111111' }],
    // An empty filter would compile to `action = ''` and match nothing, which
    // reads as "there are no events" rather than "you filtered on nothing".
    ['an empty action', { action: '' }],
    ['an empty entity type', { entity_type: '  ' }],
    ['a page size past the ceiling', { page_size: '5000' }],
  ])('rejects %s', (_label, query) => {
    expect(parse(query as Record<string, string>).success).toBe(false);
  });
});
