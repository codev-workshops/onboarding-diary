/**
 * The parts of report assembly that are impractical to provoke against real
 * data: the row cap (which needs more rows than the seed has) and the metadata
 * written when a generation fails rather than succeeds.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReportRequestInput } from '@/src/modules/reports/schemas';

const counts = { tasks: 0 };
const runs: Record<string, unknown>[] = [];

vi.mock('@/src/modules/entries/repositories', () => ({
  taskRepository: {
    count: vi.fn(async () => counts.tasks),
    list: vi.fn(async () => []),
  },
  issueRepository: { count: vi.fn(async () => 0), list: vi.fn(async () => []) },
  feedbackRepository: { count: vi.fn(async () => 0), list: vi.fn(async () => []) },
  noteRepository: { count: vi.fn(async () => 0), list: vi.fn(async () => []) },
  withheldFeedbackCount: vi.fn(async () => 0),
}));

vi.mock('@/src/modules/users/service', () => ({
  listVisibleUsers: vi.fn(async () => []),
  listUsersByIds: vi.fn(async () => [
    {
      id: 'actor-1',
      full_name: 'Ada Lovelace',
      role: 'RECRUIT',
      department: null,
      start_date: '2026-01-01',
    },
  ]),
  listDepartmentUserIds: vi.fn(async () => []),
}));

vi.mock('@/src/modules/authz/scope', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  readableUserIds: vi.fn(async () => ({ kind: 'IDS', ids: ['actor-1'] })),
}));

vi.mock('@/src/modules/reports/runs', () => ({
  recordReportRunBestEffort: vi.fn((input: Record<string, unknown>) => {
    runs.push(input);
  }),
}));

vi.mock('@/src/modules/audit/service', () => ({ recordAuditBestEffort: vi.fn() }));

const { buildReport } = await import('@/src/modules/reports/service');
const { MAX_SECTION_ROWS } = await import('@/src/modules/reports/schemas');

const actor = { id: 'actor-1', role: 'RECRUIT' as const, full_name: 'Ada Lovelace' };

const request: ReportRequestInput = {
  scope_type: 'SELF' as const,
  date_from: new Date('2026-01-01T00:00:00.000Z'),
  date_to: new Date('2026-01-31T00:00:00.000Z'),
  sections: ['TASKS'],
  include_summary: true,
  include_details: true,
  format: 'CSV' as const,
};

beforeEach(() => {
  counts.tasks = 0;
  runs.length = 0;
});

describe('row caps', () => {
  it('refuses a section that would exceed the synchronous cap, before loading it', async () => {
    counts.tasks = MAX_SECTION_ROWS + 1;

    await expect(buildReport(actor, request)).rejects.toMatchObject({
      code: 'REPORT_TOO_LARGE',
      status: 422,
    });

    const { taskRepository } = await import('@/src/modules/entries/repositories');
    expect(taskRepository.list).not.toHaveBeenCalled();
  });

  it('allows a section sitting exactly on the cap', async () => {
    counts.tasks = MAX_SECTION_ROWS;
    await expect(buildReport(actor, request)).resolves.toBeTruthy();
  });
});

describe('run metadata', () => {
  it('records the attempt with its parameters when generation fails', async () => {
    counts.tasks = MAX_SECTION_ROWS + 1;
    await buildReport(actor, request).catch(() => undefined);

    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      requestedById: 'actor-1',
      scopeType: 'SELF',
      format: 'CSV',
      status: 'FAILED',
      errorCode: 'REPORT_TOO_LARGE',
      rowCount: 0,
    });
  });

  it('records a successful attempt with the row count it produced', async () => {
    await buildReport(actor, request);
    expect(runs[0]).toMatchObject({ status: 'SUCCESS', errorCode: null, rowCount: 0 });
  });
});
