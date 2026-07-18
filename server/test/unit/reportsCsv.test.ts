import { describe, expect, it } from 'vitest';
import { csvFromReport } from '../../src/modules/reports/reports.csv.js';
import type { ReportData } from '../../src/modules/reports/reports.service.js';

function sampleReport(): ReportData {
  return {
    meta: {
      start: '2026-01-01',
      end: '2026-01-31',
      generatedAt: '2026-01-31T00:00:00.000Z',
      generatedBy: 'Ada Admin',
      scope: 'All recruits',
    },
    summary: {
      taskTotal: 1,
      taskCompleted: 1,
      issueTotal: 1,
      issueOpen: 1,
      feedbackTotal: 1,
      noteTotal: 1,
    },
    tasks: [
      {
        date: '2026-01-02',
        title: 'Setup',
        description: 'desc',
        category: 'Setup',
        status: 'Done',
        priority: 'High',
        owner: 'Rina',
      },
    ],
    issues: [
      {
        date: '2026-01-03',
        title: 'VPN',
        description: 'broken',
        severity: 'High',
        status: 'Open',
        resolutionNotes: '',
        owner: 'Rina',
      },
    ],
    feedback: [
      { date: '2026-01-04', subject: 'Buddy', type: 'Positive', details: 'great', owner: 'Rina' },
    ],
    notes: [
      { date: '2026-01-05', title: 'Reflection', content: 'notes', tags: 'week-1', owner: 'Rina' },
    ],
  };
}

describe('csvFromReport', () => {
  it('produces a header and one row per entry across all types', () => {
    const csv = csvFromReport(sampleReport());
    const lines = csv.trim().split('\n');
    expect(lines[0]).toContain('Type');
    expect(lines[0]).toContain('FeedbackType');
    // header + 4 entries
    expect(lines).toHaveLength(5);
    expect(csv).toContain('Task');
    expect(csv).toContain('Issue');
    expect(csv).toContain('Feedback');
    expect(csv).toContain('Note');
  });

  it('places type-specific values in the right columns', () => {
    const csv = csvFromReport(sampleReport());
    expect(csv).toMatch(/Feedback,2026-01-04,Rina,Buddy,great,,,,,,Positive,/);
  });
});
