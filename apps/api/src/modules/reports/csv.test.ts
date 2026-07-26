import { describe, expect, it } from 'vitest';

import type { ReportData } from './assemble.js';
import { csvField, renderCsv } from './csv.js';

const owner = {
  id: '3ab9b0f4-0000-4000-8000-000000000001',
  email: 'nadia@example.com',
  fullName: 'Nadia Khan',
  role: 'RECRUIT' as const,
  department: 'Engineering',
  startDate: '2026-07-01',
  managerId: null,
  isActive: true,
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
};

function fixture(overrides: Partial<ReportData> = {}): ReportData {
  return {
    owner,
    from: '2026-07-01',
    to: '2026-07-31',
    sections: ['TASKS'],
    generatedAt: new Date('2026-08-01T09:00:00.000Z'),
    tasks: [],
    issues: [],
    feedback: [],
    notes: [],
    ...overrides,
  };
}

describe('csvField', () => {
  it('quotes commas, quotes, and newlines', () => {
    expect(csvField('plain')).toBe('plain');
    expect(csvField('a,b')).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField('line1\nline2')).toBe('"line1\nline2"');
  });
});

describe('renderCsv', () => {
  it('renders the exact text for a fixed fixture', () => {
    const csv = renderCsv(
      fixture({
        tasks: [
          {
            id: 'task-1',
            ownerId: owner.id,
            entryDate: '2026-07-02',
            title: 'Complete VPN setup',
            description: 'Notes with a comma, a "quote", and a\nnewline',
            category: 'SETUP',
            status: 'DONE',
            priority: 'HIGH',
            createdAt: '2026-07-02T09:00:00.000Z',
            updatedAt: '2026-07-02T09:00:00.000Z',
          },
        ],
      }),
    );

    expect(csv).toBe(
      [
        '# ONBOARDING DIARY REPORT',
        '# Recruit: Nadia Khan',
        '# Range: 2026-07-01 to 2026-07-31',
        '# Generated: 2026-08-01T09:00:00.000Z',
        '',
        '# SECTION: TASKS',
        'Date,Title,Category,Status,Priority,Description',
        '2026-07-02,Complete VPN setup,SETUP,DONE,HIGH,' +
          '"Notes with a comma, a ""quote"", and a\nnewline"',
        '',
      ].join('\r\n'),
    );
  });

  it('marks an empty section rather than omitting it', () => {
    const csv = renderCsv(fixture({ sections: ['TASKS', 'NOTES'] }));
    expect(csv).toContain('# SECTION: NOTES');
    expect(csv.match(/# No entries for this range/g)).toHaveLength(2);
  });
});
