import { describe, expect, it } from 'vitest';

import {
  createTaskSchema,
  listTasksSchema,
  SORTABLE_TASK_FIELDS,
  sortColumn,
  updateTaskSchema,
} from '@/src/modules/tasks/schemas';

describe('createTaskSchema', () => {
  it('applies the documented defaults', () => {
    const parsed = createTaskSchema.parse({ entry_date: '2026-01-05', title: 'Set up the laptop' });
    expect(parsed).toMatchObject({ category: 'OTHER', status: 'TODO', priority: 'MEDIUM' });
    expect(parsed.entry_date.toISOString()).toBe('2026-01-05T00:00:00.000Z');
  });

  it.each([
    ['a date that rolls over silently in JavaScript', { entry_date: '2026-02-31', title: 'Valid title' }],
    ['a date in the wrong format', { entry_date: '05/01/2026', title: 'Valid title' }],
    ['a title below the minimum', { entry_date: '2026-01-05', title: 'ab' }],
    ['a title above the maximum', { entry_date: '2026-01-05', title: 'x'.repeat(141) }],
    ['an unknown enum value', { entry_date: '2026-01-05', title: 'Valid title', status: 'FINISHED' }],
    ['an unexpected field', { entry_date: '2026-01-05', title: 'Valid title', version: 3 }],
    ['a privilege field', { entry_date: '2026-01-05', title: 'Valid title', updated_by: 'someone' }],
  ])('rejects %s', (_case, body) => {
    expect(createTaskSchema.safeParse(body).success).toBe(false);
  });
});

describe('updateTaskSchema', () => {
  it('requires at least one field, so an empty patch is not a silent no-op', () => {
    expect(updateTaskSchema.safeParse({}).success).toBe(false);
  });

  it('refuses to reassign ownership', () => {
    expect(updateTaskSchema.safeParse({ owner_id: 'someone-else' }).success).toBe(false);
  });

  it('accepts clearing the description', () => {
    expect(updateTaskSchema.parse({ description: null })).toEqual({ description: null });
  });
});

describe('listTasksSchema', () => {
  it('splits a comma-separated enum filter', () => {
    const parsed = listTasksSchema.parse({ status: 'TODO,DONE' });
    expect(parsed.status).toEqual(['TODO', 'DONE']);
  });

  it('rejects an unknown value inside a comma-separated filter', () => {
    expect(listTasksSchema.safeParse({ status: 'TODO,ELSEWHERE' }).success).toBe(false);
  });

  it('rejects an inverted date range instead of returning nothing', () => {
    expect(listTasksSchema.safeParse({ date_from: '2026-02-01', date_to: '2026-01-01' }).success).toBe(false);
  });

  it('caps the page size so a caller cannot ask for the whole table', () => {
    expect(listTasksSchema.safeParse({ page_size: '5000' }).success).toBe(false);
    expect(listTasksSchema.parse({}).page_size).toBe(20);
  });

  it('rejects an unknown query parameter, which is where a scope bypass would hide', () => {
    expect(listTasksSchema.safeParse({ deletedAt: 'null' }).success).toBe(false);
  });

  it('maps every sortable field to a real column and nothing else', () => {
    for (const field of SORTABLE_TASK_FIELDS) {
      expect(sortColumn(field)).toMatch(/^[a-zA-Z]+$/);
    }
    expect(listTasksSchema.safeParse({ sort: 'ownerId' }).success).toBe(false);
  });
});
