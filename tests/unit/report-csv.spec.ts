/**
 * CSV rendering. Two of these tests are security tests rather than formatting
 * tests: a diary entry is user-controlled text, so it is the obvious carrier
 * for both a broken row (unescaped quote or newline) and a spreadsheet formula.
 */
import { describe, expect, it } from 'vitest';

import { contentDisposition, escapeCsvCell, renderCsv } from '@/src/modules/reports/csv';
import type { ReportModel, ReportSectionModel } from '@/src/modules/reports/model';

const section = (
  key: ReportSectionModel['key'],
  columns: string[],
  rows: Record<string, string | number | null>[]
): ReportSectionModel => ({
  key,
  label: key,
  columns: columns.map((column) => ({ key: column, label: column })),
  row_count: rows.length,
  rows,
});

const model = (sections: ReportSectionModel[]): ReportModel =>
  ({
    report_id: 'r1',
    generated_at: '2026-01-01T00:00:00.000Z',
    generated_by: { id: 'u1', full_name: 'Ada', role: 'ADMIN' },
    scope: { type: 'SELF', description: 'Ada', subjects: [] },
    period: { date_from: '2026-01-01', date_to: '2026-01-31' },
    sections_included: sections.map((entry) => entry.key),
    filters_applied: {},
    summary: null,
    sections,
    withheld: { feedback: 0 },
    confidentiality: 'Confidential',
    filename_base: 'onboarding-report_ada_2026-01-01_2026-01-31',
  }) as ReportModel;

describe('escapeCsvCell', () => {
  it('quotes and doubles the characters that would otherwise break the row', () => {
    expect(escapeCsvCell('plain')).toBe('plain');
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell('line\r\nbreak')).toBe('"line\r\nbreak"');
  });

  it('neutralises every formula prefix a spreadsheet would execute', () => {
    expect(escapeCsvCell('=HYPERLINK("http://evil","claim")')).toBe(
      '"\'=HYPERLINK(""http://evil"",""claim"")"'
    );
    for (const prefix of ['=', '+', '-', '@', '\t', '\r']) {
      expect(escapeCsvCell(`${prefix}cmd`).replace(/^"|"$/g, '').startsWith("'")).toBe(true);
    }
  });

  it('renders nulls as empty and numbers as themselves', () => {
    expect(escapeCsvCell(null)).toBe('');
    expect(escapeCsvCell(undefined)).toBe('');
    expect(escapeCsvCell(0)).toBe('0');
  });

  it('leaves a hyphen inside a value alone — only a leading one is dangerous', () => {
    expect(escapeCsvCell('day-one setup')).toBe('day-one setup');
  });
});

describe('renderCsv', () => {
  it('emits a BOM and CRLF line endings so Excel reads UTF-8 correctly', () => {
    const csv = renderCsv(model([section('tasks', ['title'], [{ title: 'Café' }])]));

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toBe('\uFEFFtitle\r\nCafé\r\n');
  });

  it('writes one table with a record_type column when several sections are combined', () => {
    const csv = renderCsv(
      model([
        section('tasks', ['user', 'title'], [{ user: 'Ada', title: 'Set up laptop' }]),
        section('issues', ['user', 'title', 'severity'], [{ user: 'Ada', title: 'VPN', severity: 'HIGH' }]),
      ])
    );

    expect(csv.slice(1).split('\r\n')).toEqual([
      'record_type,user,title,severity',
      'tasks,Ada,Set up laptop,',
      'issues,Ada,VPN,HIGH',
      '',
    ]);
  });

  it('omits record_type for a single section', () => {
    const csv = renderCsv(model([section('notes', ['title'], [])]));
    expect(csv).toBe('\uFEFFtitle\r\n');
  });

  it('still produces a readable file when details were not requested', () => {
    expect(renderCsv(model([]))).toBe('\uFEFFrecord_type\r\n');
  });
});

describe('contentDisposition', () => {
  it('carries the name twice so non-ASCII survives', () => {
    expect(contentDisposition('onboarding-report_org_2026-01-01_2026-01-31.csv')).toBe(
      'attachment; filename="onboarding-report_org_2026-01-01_2026-01-31.csv"; ' +
        "filename*=UTF-8''onboarding-report_org_2026-01-01_2026-01-31.csv"
    );
  });

  it('cannot be used to inject a header through the filename', () => {
    const header = contentDisposition('re"port\r\n.csv');
    expect(header).not.toContain('\r');
    expect(header).not.toContain('\n');
    expect(header).toContain('filename="re_port__.csv"');
  });
});
