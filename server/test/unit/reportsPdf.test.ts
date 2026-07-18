import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { pdfFromReport } from '../../src/modules/reports/reports.pdf.js';
import type { ReportData } from '../../src/modules/reports/reports.service.js';

/**
 * Extracts the visible text from a pdfkit-generated PDF without a third-party
 * parser: pdfkit compresses its content streams with FlateDecode, so we inflate
 * each `stream…endstream` block and decode the strings drawn by the `Tj`/`TJ`
 * text operators. pdfkit emits them as hex strings (`<48656c6c6f>`), split into
 * chunks by kerning adjustments, so we concatenate the chunks per line. This
 * validates content presence, not layout/look-and-feel.
 */
function extractPdfText(pdf: Buffer): string {
  const out: string[] = [];
  let searchFrom = 0;
  // Iterate over every stream object in the file.
  for (;;) {
    const streamIdx = pdf.indexOf('stream', searchFrom);
    if (streamIdx === -1) break;
    const endIdx = pdf.indexOf('endstream', streamIdx);
    if (endIdx === -1) break;
    searchFrom = endIdx + 'endstream'.length;

    // Skip the CR/LF that follows the `stream` keyword.
    let start = streamIdx + 'stream'.length;
    if (pdf[start] === 0x0d) start += 1;
    if (pdf[start] === 0x0a) start += 1;
    const raw = pdf.subarray(start, endIdx);

    let content: Buffer;
    try {
      content = inflateSync(raw);
    } catch {
      // Not a FlateDecode stream (e.g. metadata) — ignore.
      continue;
    }
    out.push(decodeTextOperators(content.toString('latin1')));
  }
  return out.join('\n');
}

/**
 * Decodes the text drawn by a content stream. Each `Tj`/`TJ` show operator lives
 * on its own line; within a line we concatenate every hex string (`<..>`) and
 * literal string (`(..)`) chunk to reconstruct the full run, then join lines.
 */
function decodeTextOperators(content: string): string {
  const lines: string[] = [];
  const token = /<([0-9A-Fa-f]*)>|\(((?:\\.|[^\\()])*)\)/g;
  for (const line of content.split('\n')) {
    if (!/\bT[jJ]\b/.test(line)) continue;
    let m: RegExpExecArray | null;
    let text = '';
    while ((m = token.exec(line)) !== null) {
      if (m[1] !== undefined) {
        text += Buffer.from(m[1], 'hex').toString('latin1');
      } else {
        text += m[2]
          .replace(/\\(\d{3})/g, (_s, oct) => String.fromCharCode(parseInt(oct, 8)))
          .replace(/\\([()\\])/g, '$1');
      }
    }
    token.lastIndex = 0;
    if (text) lines.push(text);
  }
  return lines.join('\n');
}

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
      taskTotal: 3,
      taskCompleted: 2,
      issueTotal: 1,
      issueOpen: 1,
      feedbackTotal: 1,
      noteTotal: 1,
    },
    tasks: [
      {
        date: '2026-01-02',
        title: 'ConfigureLaptop',
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
        title: 'VpnBroken',
        description: 'broken',
        severity: 'High',
        status: 'Open',
        resolutionNotes: '',
        owner: 'Rina',
      },
    ],
    feedback: [
      {
        date: '2026-01-04',
        subject: 'BuddyProgram',
        type: 'Positive',
        details: 'great',
        owner: 'Rina',
      },
    ],
    notes: [
      {
        date: '2026-01-05',
        title: 'WeekOneReflection',
        content: 'notes',
        tags: 'week-1',
        owner: 'Rina',
      },
    ],
  };
}

describe('pdfFromReport (content presence)', () => {
  it('produces a valid PDF whose text contains the header, meta, summary and every entry', async () => {
    const pdf = await pdfFromReport(sampleReport());
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');

    const text = extractPdfText(pdf);

    // Header + meta.
    expect(text).toContain('Onboarding Diary');
    expect(text).toContain('Report');
    expect(text).toContain('2026-01-01');
    expect(text).toContain('2026-01-31');
    expect(text).toContain('All recruits');
    expect(text).toContain('Ada Admin');

    // Summary counts.
    expect(text).toContain('Summary');
    expect(text).toMatch(/Tasks:\s*3/);
    expect(text).toMatch(/completed\s*2/);
    expect(text).toMatch(/Issues:\s*1/);
    expect(text).toMatch(/open\s*1/);
    expect(text).toMatch(/Feedback:\s*1/);
    expect(text).toMatch(/Notes:\s*1/);

    // Section headers.
    expect(text).toContain('Tasks (1)');
    expect(text).toContain('Issues (1)');
    expect(text).toContain('Feedback (1)');
    expect(text).toContain('Notes (1)');

    // One distinctive value per entry type is actually rendered.
    expect(text).toContain('ConfigureLaptop');
    expect(text).toContain('VpnBroken');
    expect(text).toContain('BuddyProgram');
    expect(text).toContain('WeekOneReflection');
    expect(text).toContain('Rina');
  });

  it('renders empty-section placeholders when there are no entries in range', async () => {
    const empty: ReportData = {
      ...sampleReport(),
      summary: {
        taskTotal: 0,
        taskCompleted: 0,
        issueTotal: 0,
        issueOpen: 0,
        feedbackTotal: 0,
        noteTotal: 0,
      },
      tasks: [],
      issues: [],
      feedback: [],
      notes: [],
    };
    const text = extractPdfText(await pdfFromReport(empty));
    expect(text).toContain('Tasks (0)');
    expect(text).toContain('No entries in range.');
  });
});
