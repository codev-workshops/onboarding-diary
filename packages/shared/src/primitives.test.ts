import { describe, expect, it } from 'vitest';

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './constants.js';
import { TASK_STATUSES } from './enums.js';
import {
  dateRangeQuery,
  enumListFilter,
  isCalendarDate,
  paginationQuery,
  pastOrPresentCalendarDate,
  todayUtc,
} from './primitives.js';

describe('isCalendarDate', () => {
  it.each(['2026-07-26', '2024-02-29', '2000-01-01'])('accepts %s', (value) => {
    expect(isCalendarDate(value)).toBe(true);
  });

  it.each(['2026-7-26', '2026-02-30', '2023-02-29', '20260726', 'yesterday', ''])(
    'rejects %s',
    (value) => {
      expect(isCalendarDate(value)).toBe(false);
    },
  );
});

describe('pastOrPresentCalendarDate', () => {
  it('accepts today', () => {
    expect(pastOrPresentCalendarDate.parse(todayUtc())).toBe(todayUtc());
  });

  it('rejects tomorrow', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const result = pastOrPresentCalendarDate.safeParse(tomorrow);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Date cannot be in the future');
  });
});

describe('paginationQuery', () => {
  it('defaults page and pageSize', () => {
    expect(paginationQuery.parse({})).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
  });

  it('coerces numeric strings', () => {
    expect(paginationQuery.parse({ page: '3', pageSize: '50' })).toEqual({ page: 3, pageSize: 50 });
  });

  it('clamps pageSize to the maximum', () => {
    expect(paginationQuery.parse({ pageSize: '5000' }).pageSize).toBe(MAX_PAGE_SIZE);
  });

  it('falls back for junk and out-of-range input', () => {
    expect(paginationQuery.parse({ page: 'abc', pageSize: '0' })).toEqual({
      page: 1,
      pageSize: 1,
    });
    expect(paginationQuery.parse({ page: '-4' }).page).toBe(1);
  });
});

describe('dateRangeQuery', () => {
  it('accepts an ordered range', () => {
    expect(dateRangeQuery.parse({ from: '2026-01-01', to: '2026-01-31' })).toEqual({
      from: '2026-01-01',
      to: '2026-01-31',
    });
  });

  it('rejects a reversed range', () => {
    expect(dateRangeQuery.safeParse({ from: '2026-02-01', to: '2026-01-01' }).success).toBe(false);
  });
});

describe('enumListFilter', () => {
  const filter = enumListFilter(TASK_STATUSES);

  it('parses a single value', () => {
    expect(filter.parse('DONE')).toEqual(['DONE']);
  });

  it('parses a comma-separated list and de-duplicates', () => {
    expect(filter.parse('OPEN,DONE,DONE'.replace('OPEN', 'BLOCKED'))).toEqual(['BLOCKED', 'DONE']);
  });

  it('parses a repeated query parameter', () => {
    expect(filter.parse(['DONE', 'BLOCKED'])).toEqual(['DONE', 'BLOCKED']);
  });

  it('rejects unknown members', () => {
    expect(filter.safeParse('NOPE').success).toBe(false);
  });
});
