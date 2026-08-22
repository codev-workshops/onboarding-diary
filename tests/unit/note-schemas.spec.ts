import { describe, expect, it } from 'vitest';

import {
  createNoteSchema,
  listNotesSchema,
  SORTABLE_NOTE_FIELDS,
  sortColumn,
  updateNoteSchema,
} from '@/src/modules/notes/schemas';

const valid = {
  entry_date: '2026-01-05',
  title: 'Where the runbooks live',
  content: 'The deployment runbooks are in the platform wiki, not the repository.',
};

describe('createNoteSchema', () => {
  it('defaults to no tags rather than to null', () => {
    expect(createNoteSchema.parse(valid).tags).toEqual([]);
  });

  it('lower-cases and de-duplicates tags, so #Access and #access are one tag', () => {
    expect(createNoteSchema.parse({ ...valid, tags: ['Access', 'access', ' PLATFORM '] }).tags).toEqual([
      'access',
      'platform',
    ]);
  });

  it.each([
    ['a date that rolls over silently in JavaScript', { ...valid, entry_date: '2026-02-31' }],
    ['a date in the wrong format', { ...valid, entry_date: '05/01/2026' }],
    ['a title below the minimum', { ...valid, title: 'ab' }],
    ['empty content', { ...valid, content: '   ' }],
    ['more tags than the column allows', { ...valid, tags: Array.from({ length: 11 }, (_, i) => `t${i}`) }],
    ['a tag longer than the limit', { ...valid, tags: ['x'.repeat(31)] }],
    ['an empty tag', { ...valid, tags: [' '] }],
    ['a version supplied by the client', { ...valid, version: 3 }],
  ])('rejects %s', (_case, body) => {
    expect(createNoteSchema.safeParse(body).success).toBe(false);
  });
});

describe('updateNoteSchema', () => {
  it('requires at least one field, so an empty patch is not a silent no-op', () => {
    expect(updateNoteSchema.safeParse({}).success).toBe(false);
  });

  it('treats expected_version alone as an empty patch', () => {
    expect(updateNoteSchema.safeParse({ expected_version: 2 }).success).toBe(false);
  });

  it('refuses to reassign ownership', () => {
    expect(updateNoteSchema.safeParse({ owner_id: 'someone-else' }).success).toBe(false);
  });

  it('accepts clearing every tag, which is a real edit and not an empty patch', () => {
    expect(updateNoteSchema.parse({ tags: [] })).toEqual({ tags: [] });
  });
});

describe('listNotesSchema', () => {
  it('lower-cases the tag filter to match the stored form', () => {
    expect(listNotesSchema.parse({ tag: 'VPN' }).tag).toBe('vpn');
  });

  it('rejects an inverted date range instead of returning nothing', () => {
    expect(listNotesSchema.safeParse({ date_from: '2026-02-01', date_to: '2026-01-01' }).success).toBe(false);
  });

  it('caps the page size so a caller cannot ask for the whole table', () => {
    expect(listNotesSchema.safeParse({ page_size: '5000' }).success).toBe(false);
    expect(listNotesSchema.parse({}).page_size).toBe(20);
  });

  it('rejects an unknown query parameter, which is where a scope bypass would hide', () => {
    expect(listNotesSchema.safeParse({ deletedAt: 'null' }).success).toBe(false);
  });

  it('maps every sortable field to a real column and nothing else', () => {
    for (const field of SORTABLE_NOTE_FIELDS) {
      expect(sortColumn(field)).toMatch(/^[a-zA-Z]+$/);
    }
    expect(listNotesSchema.safeParse({ sort: 'ownerId' }).success).toBe(false);
  });
});
