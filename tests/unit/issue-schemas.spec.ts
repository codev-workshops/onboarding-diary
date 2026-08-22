import { describe, expect, it } from 'vitest';

import {
  createIssueSchema,
  listIssuesSchema,
  SORTABLE_ISSUE_FIELDS,
  sortColumn,
  updateIssueSchema,
} from '@/src/modules/issues/schemas';

const valid = {
  entry_date: '2026-01-05',
  title: 'Cannot reach the staging database',
  description: 'The connection times out from the VPN, so I cannot run the seed script.',
};

describe('createIssueSchema', () => {
  it('applies the documented defaults', () => {
    const parsed = createIssueSchema.parse(valid);
    expect(parsed).toMatchObject({ severity: 'MEDIUM', status: 'OPEN' });
    expect(parsed.entry_date.toISOString()).toBe('2026-01-05T00:00:00.000Z');
  });

  it.each([
    ['a date that rolls over silently in JavaScript', { ...valid, entry_date: '2026-02-31' }],
    ['a date in the wrong format', { ...valid, entry_date: '05/01/2026' }],
    ['a title below the minimum', { ...valid, title: 'ab' }],
    ['a description below the minimum', { ...valid, description: 'too short' }],
    ['an unknown severity', { ...valid, severity: 'CATASTROPHIC' }],
    ['an unknown status', { ...valid, status: 'PARKED' }],
    ['a server-derived field', { ...valid, resolved_at: '2026-01-05T00:00:00.000Z' }],
    ['a version supplied by the client', { ...valid, version: 3 }],
    ['resolution notes below the length the CHECK requires', { ...valid, resolution_notes: 'fixed' }],
  ])('rejects %s', (_case, body) => {
    expect(createIssueSchema.safeParse(body).success).toBe(false);
  });

  it.each(['RESOLVED', 'CLOSED'])('refuses %s without resolution notes', (status) => {
    expect(createIssueSchema.safeParse({ ...valid, status }).success).toBe(false);
    expect(
      createIssueSchema.safeParse({ ...valid, status, resolution_notes: 'IT granted the access.' }).success
    ).toBe(true);
  });
});

describe('updateIssueSchema', () => {
  it('requires at least one field, so an empty patch is not a silent no-op', () => {
    expect(updateIssueSchema.safeParse({}).success).toBe(false);
  });

  it('treats expected_version alone as an empty patch', () => {
    expect(updateIssueSchema.safeParse({ expected_version: 2 }).success).toBe(false);
  });

  it('refuses to reassign ownership or to stamp the resolution itself', () => {
    expect(updateIssueSchema.safeParse({ owner_id: 'someone-else' }).success).toBe(false);
    expect(updateIssueSchema.safeParse({ resolved_at: '2026-01-05T00:00:00.000Z' }).success).toBe(false);
  });

  it('accepts the manager’s two permitted fields', () => {
    const parsed = updateIssueSchema.parse({
      status: 'IN_PROGRESS',
      resolution_notes: 'Escalated to the platform team.',
    });
    expect(parsed).toEqual({ status: 'IN_PROGRESS', resolution_notes: 'Escalated to the platform team.' });
  });
});

describe('listIssuesSchema', () => {
  it('splits a comma-separated enum filter', () => {
    expect(listIssuesSchema.parse({ status: 'OPEN,CLOSED' }).status).toEqual(['OPEN', 'CLOSED']);
  });

  it('rejects an unknown value inside a comma-separated filter', () => {
    expect(listIssuesSchema.safeParse({ severity: 'HIGH,EXTREME' }).success).toBe(false);
  });

  it('rejects an inverted date range instead of returning nothing', () => {
    expect(listIssuesSchema.safeParse({ date_from: '2026-02-01', date_to: '2026-01-01' }).success).toBe(
      false
    );
  });

  it('caps the page size so a caller cannot ask for the whole table', () => {
    expect(listIssuesSchema.safeParse({ page_size: '5000' }).success).toBe(false);
    expect(listIssuesSchema.parse({}).page_size).toBe(20);
  });

  it('rejects an unknown query parameter, which is where a scope bypass would hide', () => {
    expect(listIssuesSchema.safeParse({ deletedAt: 'null' }).success).toBe(false);
  });

  it('maps every sortable field to a real column and nothing else', () => {
    for (const field of SORTABLE_ISSUE_FIELDS) {
      expect(sortColumn(field)).toMatch(/^[a-zA-Z]+$/);
    }
    expect(listIssuesSchema.safeParse({ sort: 'ownerId' }).success).toBe(false);
  });
});
