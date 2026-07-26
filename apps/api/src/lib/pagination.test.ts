import { describe, expect, it } from 'vitest';

import {
  buildMeta,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  resolvePageParams,
  toPrismaPage,
} from './pagination.js';

describe('resolvePageParams', () => {
  it('defaults to the first page', () => {
    expect(resolvePageParams({})).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
    expect(resolvePageParams(undefined)).toEqual({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
  });

  it('clamps pageSize to the maximum', () => {
    expect(resolvePageParams({ pageSize: '1000' }).pageSize).toBe(MAX_PAGE_SIZE);
  });

  it('falls back for invalid input', () => {
    expect(resolvePageParams({ page: 'x', pageSize: 'y' })).toEqual({
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    });
  });
});

describe('toPrismaPage', () => {
  it('translates a page into skip/take', () => {
    expect(toPrismaPage({ page: 3, pageSize: 20 })).toEqual({ skip: 40, take: 20 });
    expect(toPrismaPage({ page: 1, pageSize: 50 })).toEqual({ skip: 0, take: 50 });
  });
});

describe('buildMeta', () => {
  it('echoes the page and the total', () => {
    expect(buildMeta({ page: 2, pageSize: 20 }, 137)).toEqual({
      page: 2,
      pageSize: 20,
      total: 137,
    });
  });
});
