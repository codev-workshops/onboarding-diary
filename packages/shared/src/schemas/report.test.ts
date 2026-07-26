import { describe, expect, it } from 'vitest';

import { MAX_REPORT_RANGE_DAYS } from '../constants.js';
import { calendarDaySpan, createReportBody, reportFilename, slugifyName } from './report.js';

describe('calendarDaySpan', () => {
  it('counts both boundary days', () => {
    expect(calendarDaySpan('2026-07-01', '2026-07-01')).toBe(1);
    expect(calendarDaySpan('2026-07-01', '2026-07-31')).toBe(31);
  });
});

describe('createReportBody', () => {
  it('defaults to every section and keeps the documented order', () => {
    const parsed = createReportBody.parse({
      from: '2026-07-01',
      to: '2026-07-31',
      format: 'CSV',
    });
    expect(parsed.sections).toEqual(['TASKS', 'ISSUES', 'FEEDBACK', 'NOTES']);

    expect(
      createReportBody.parse({
        from: '2026-07-01',
        to: '2026-07-31',
        format: 'PDF',
        sections: ['NOTES', 'TASKS'],
      }).sections,
    ).toEqual(['TASKS', 'NOTES']);
  });

  it('rejects an empty section list and an unknown format', () => {
    expect(
      createReportBody.safeParse({
        from: '2026-07-01',
        to: '2026-07-31',
        format: 'CSV',
        sections: [],
      }).success,
    ).toBe(false);
    expect(
      createReportBody.safeParse({ from: '2026-07-01', to: '2026-07-31', format: 'XLSX' }).success,
    ).toBe(false);
  });

  it('rejects an inverted range and one over the maximum span', () => {
    const inverted = createReportBody.safeParse({
      from: '2026-07-31',
      to: '2026-07-01',
      format: 'CSV',
    });
    expect(inverted.success).toBe(false);
    expect(inverted.error?.issues[0]?.path).toEqual(['from']);

    const tooLong = createReportBody.safeParse({
      from: '2025-01-01',
      to: '2026-07-01',
      format: 'CSV',
    });
    expect(tooLong.success).toBe(false);
    expect(tooLong.error?.issues[0]?.path).toEqual(['to']);
  });

  it('accepts a range of exactly the maximum span', () => {
    const to = new Date(Date.UTC(2026, 0, 1) + (MAX_REPORT_RANGE_DAYS - 1) * 86_400_000)
      .toISOString()
      .slice(0, 10);
    expect(createReportBody.safeParse({ from: '2026-01-01', to, format: 'CSV' }).success).toBe(
      true,
    );
  });
});

describe('reportFilename', () => {
  it('slugifies the recruit name and picks the extension', () => {
    expect(slugifyName('Nadia  Khan!')).toBe('nadia-khan');
    expect(slugifyName('!!!')).toBe('recruit');
    expect(
      reportFilename({
        fullName: 'Nadia Khan',
        from: '2026-07-01',
        to: '2026-07-31',
        format: 'PDF',
      }),
    ).toBe('onboarding-diary_nadia-khan_2026-07-01_2026-07-31.pdf');
  });
});
