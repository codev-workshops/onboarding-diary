import { describe, expect, it } from 'vitest';

import {
  createFeedbackSchema,
  listFeedbackSchema,
  SORTABLE_FEEDBACK_FIELDS,
  sortColumn,
  updateFeedbackSchema,
} from '@/src/modules/feedback/schemas';

const valid = {
  entry_date: '2026-01-05',
  subject: 'The buddy system worked well',
  type: 'POSITIVE',
  details: 'Having a named buddy in week one removed most of the guesswork.',
};

describe('createFeedbackSchema', () => {
  it('defaults visibility to manager-visible rather than to the private option', () => {
    const parsed = createFeedbackSchema.parse(valid);
    expect(parsed.visibility).toBe('MANAGER_VISIBLE');
    expect(parsed.entry_date.toISOString()).toBe('2026-01-05T00:00:00.000Z');
  });

  it('accepts the author choosing to hide the entry from their manager', () => {
    expect(createFeedbackSchema.parse({ ...valid, visibility: 'ADMIN_ONLY' }).visibility).toBe('ADMIN_ONLY');
  });

  it.each([
    ['a date that rolls over silently in JavaScript', { ...valid, entry_date: '2026-02-31' }],
    ['a date in the wrong format', { ...valid, entry_date: '05/01/2026' }],
    ['a subject below the minimum', { ...valid, subject: 'ab' }],
    ['details below the minimum', { ...valid, details: 'too short' }],
    ['an unknown type', { ...valid, type: 'GRUMBLE' }],
    ['an unknown visibility', { ...valid, visibility: 'EVERYONE' }],
    ['a version supplied by the client', { ...valid, version: 3 }],
    ['a server-derived field', { ...valid, updated_by_id: 'someone' }],
  ])('rejects %s', (_case, body) => {
    expect(createFeedbackSchema.safeParse(body).success).toBe(false);
  });
});

describe('updateFeedbackSchema', () => {
  it('requires at least one field, so an empty patch is not a silent no-op', () => {
    expect(updateFeedbackSchema.safeParse({}).success).toBe(false);
  });

  it('treats expected_version alone as an empty patch', () => {
    expect(updateFeedbackSchema.safeParse({ expected_version: 2 }).success).toBe(false);
  });

  it('refuses to reassign ownership', () => {
    expect(updateFeedbackSchema.safeParse({ owner_id: 'someone-else' }).success).toBe(false);
  });

  it('lets the author reclassify an entry as admin-only after the fact', () => {
    expect(updateFeedbackSchema.parse({ visibility: 'ADMIN_ONLY' })).toEqual({ visibility: 'ADMIN_ONLY' });
  });
});

describe('listFeedbackSchema', () => {
  it('splits a comma-separated enum filter', () => {
    expect(listFeedbackSchema.parse({ type: 'POSITIVE,CONCERN' }).type).toEqual(['POSITIVE', 'CONCERN']);
  });

  it('rejects an unknown value inside a comma-separated filter', () => {
    expect(listFeedbackSchema.safeParse({ type: 'POSITIVE,NONSENSE' }).success).toBe(false);
    expect(listFeedbackSchema.safeParse({ visibility: 'MANAGER_VISIBLE,EVERYONE' }).success).toBe(false);
  });

  it('rejects an inverted date range instead of returning nothing', () => {
    expect(listFeedbackSchema.safeParse({ date_from: '2026-02-01', date_to: '2026-01-01' }).success).toBe(
      false
    );
  });

  it('caps the page size so a caller cannot ask for the whole table', () => {
    expect(listFeedbackSchema.safeParse({ page_size: '5000' }).success).toBe(false);
    expect(listFeedbackSchema.parse({}).page_size).toBe(20);
  });

  it('rejects an unknown query parameter, which is where a scope bypass would hide', () => {
    expect(listFeedbackSchema.safeParse({ deletedAt: 'null' }).success).toBe(false);
  });

  it('maps every sortable field to a real column and nothing else', () => {
    for (const field of SORTABLE_FEEDBACK_FIELDS) {
      expect(sortColumn(field)).toMatch(/^[a-zA-Z]+$/);
    }
    expect(listFeedbackSchema.safeParse({ sort: 'ownerId' }).success).toBe(false);
  });
});
