/**
 * PDF rendering. The interesting assertions are not about looks — they are
 * that every page carries the report id and its number, that a hostile string
 * in an entry cannot crash the renderer or reach out to a URL, and that the
 * document contains exactly the rows the model contains and nothing else.
 */
import { describe, expect, it } from 'vitest';

import type { ReportModel, ReportSectionModel } from '@/src/modules/reports/model';
import {
  LONG_TEXT_FOOTNOTE,
  LONG_TEXT_LIMIT,
  columnWidths,
  pdfColumns,
  renderPdf,
  sanitizeText,
  truncateLongText,
  wrapCell,
} from '@/src/modules/reports/pdf';
import { pdfPageTexts } from '@/tests/support/pdf-text';

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

const model = (sections: ReportSectionModel[], overrides: Partial<ReportModel> = {}): ReportModel =>
  ({
    report_id: 'rep_0001',
    generated_at: '2026-01-01T00:00:00.000Z',
    generated_by: { id: 'u1', full_name: 'Ada Lovelace', role: 'ADMIN' },
    scope: {
      type: 'SELF',
      description: 'Ada Lovelace',
      subjects: [
        {
          id: 'u1',
          full_name: 'Ada Lovelace',
          role: 'RECRUIT',
          department: 'Engineering',
          start_date: '2025-12-01',
        },
      ],
    },
    period: { date_from: '2026-01-01', date_to: '2026-01-31' },
    sections_included: sections.map((entry) => entry.key),
    filters_applied: {},
    summary: null,
    sections,
    withheld: { feedback: 0 },
    confidentiality: 'Confidential — onboarding records.',
    filename_base: 'onboarding-report_ada-lovelace_2026-01-01_2026-01-31',
    ...overrides,
  }) as ReportModel;

describe('sanitizeText', () => {
  it('keeps what the standard fonts can draw and replaces what they cannot', () => {
    expect(sanitizeText('Café — “quoted” … •')).toBe('Café — “quoted” … •');
    expect(sanitizeText('shipped 🚀 today')).toBe('shipped ? today');
    expect(sanitizeText('日本語')).toBe('???');
  });

  it('folds control characters to spaces but keeps paragraph breaks', () => {
    expect(sanitizeText('a\tb\u0007c')).toBe('a b c');
    expect(sanitizeText('first\nsecond')).toBe('first\nsecond');
  });

  // WinAnsi maps 0x80–0x9F to €, “, — and friends rather than to the C1
  // controls, so a pasted C1 byte throws at the font layer — a 500 instead of a
  // download, which is the failure sanitizeText exists to prevent.
  it('renders every C1 control rather than throwing at the font layer', async () => {
    const c1 = Array.from({ length: 0x20 }, (_, index) => String.fromCharCode(0x80 + index)).join('');

    expect(sanitizeText(`a${c1}b`)).toBe(`a${' '.repeat(0x20)}b`);
    await expect(
      renderPdf(model([section('tasks', ['title'], [{ title: `pasted${c1}text` }])]))
    ).resolves.toBeInstanceOf(Uint8Array);
  });
});

describe('truncateLongText', () => {
  it('truncates only the free-text columns, with an ellipsis', () => {
    const long = 'x'.repeat(LONG_TEXT_LIMIT + 50);

    expect(truncateLongText('description', long)).toHaveLength(LONG_TEXT_LIMIT + 1);
    expect(truncateLongText('description', long).endsWith('\u2026')).toBe(true);
    expect(truncateLongText('title', long)).toBe(long);
    expect(truncateLongText('content', 'short')).toBe('short');
  });
});

describe('wrapCell', () => {
  const font = {
    widthOfTextAtSize: (text: string, size: number) => text.length * size * 0.5,
  } as Parameters<typeof wrapCell>[1];

  it('breaks on spaces to fit the column', () => {
    expect(wrapCell('one two three four', font, 10, 50)).toEqual(['one two', 'three four']);
  });

  it('splits a word that is wider than the column so a cell cannot overflow', () => {
    const lines = wrapCell('https://example.test/a/very/long/path', font, 10, 50);

    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(10);
  });

  it('returns a single empty line for an empty cell', () => {
    expect(wrapCell('', font, 10, 50)).toEqual(['']);
  });
});

describe('columnWidths', () => {
  it('divides the page between the columns and nothing else', () => {
    const columns = [
      { key: 'user', label: 'User' },
      { key: 'description', label: 'Description' },
    ];
    const widths = columnWidths(columns, 450);

    expect(widths.reduce((sum, width) => sum + width, 0)).toBeCloseTo(450, 6);
    expect(widths[1]).toBeGreaterThan(widths[0]);
  });
});

describe('pdfColumns', () => {
  it('drops the uuid column, which is unreadable on paper and present in the CSV', () => {
    const columns = pdfColumns(section('tasks', ['user', 'user_id', 'title'], []));

    expect(columns.map((column) => column.key)).toEqual(['user', 'title']);
  });
});

describe('renderPdf', () => {
  it('produces a PDF with the scope, period and confidentiality notice on the cover', async () => {
    const bytes = await renderPdf(model([section('tasks', ['user', 'title'], [])]));

    expect(Buffer.from(bytes.slice(0, 5)).toString('latin1')).toBe('%PDF-');

    const pages = await pdfPageTexts(bytes);

    expect(pages[0]).toContain('Onboarding report');
    expect(pages[0]).toContain('Ada Lovelace');
    expect(pages[0]).toContain('2026-01-01 to 2026-01-31');
    expect(pages[0]).toContain('Confidential');
  });

  it('numbers every page and repeats the report id in the footer', async () => {
    const rows = Array.from({ length: 120 }, (_, index) => ({
      user: 'Ada Lovelace',
      title: `Task ${index}`,
    }));
    const pages = await pdfPageTexts(await renderPdf(model([section('tasks', ['user', 'title'], rows)])));

    expect(pages.length).toBeGreaterThan(2);
    for (const [index, page] of pages.entries()) {
      expect(page).toContain(`Page ${index + 1} of ${pages.length}`);
      expect(page).toContain('rep_0001');
    }
  });

  it('repeats the table header on each page a section spills onto', async () => {
    const rows = Array.from({ length: 120 }, (_, index) => ({ user: 'Ada', title: `Task ${index}` }));
    const pages = await pdfPageTexts(await renderPdf(model([section('tasks', ['user', 'title'], rows)])));
    const detailPages = pages.filter((page) => page.includes('Task '));

    expect(detailPages.length).toBeGreaterThan(1);
    for (const page of detailPages) expect(page).toContain('user title');
  });

  it('starts each detail section on its own page', async () => {
    const pages = await pdfPageTexts(
      await renderPdf(
        model([
          section('tasks', ['title'], [{ title: 'Set up laptop' }]),
          section('issues', ['title'], [{ title: 'VPN is down' }]),
        ])
      )
    );

    const tasksPage = pages.findIndex((page) => page.includes('Set up laptop'));
    const issuesPage = pages.findIndex((page) => page.includes('VPN is down'));

    expect(tasksPage).toBeGreaterThanOrEqual(0);
    expect(issuesPage).toBe(tasksPage + 1);
  });

  it('truncates free text at the limit and says where the full text is', async () => {
    const description = `${'a'.repeat(LONG_TEXT_LIMIT)}SECRETTAIL`;
    const pages = await pdfPageTexts(
      await renderPdf(model([section('tasks', ['title', 'description'], [{ title: 'T', description }])]))
    );
    const body = pages.join('\n');

    expect(body).not.toContain('SECRETTAIL');
    expect(body).toContain(LONG_TEXT_FOOTNOTE);
  });

  it('renders a hostile entry as text rather than failing or following it', async () => {
    const hostile = '=HYPERLINK("http://evil.example","payslip") 🚀 <script>alert(1)</script>';
    const pages = await pdfPageTexts(
      await renderPdf(model([section('tasks', ['title'], [{ title: hostile }])]))
    );

    expect(pages.join('\n')).toContain('=HYPERLINK("http://evil.example","payslip")');
  });

  it('renders the summary totals when the model carries a summary', async () => {
    const summary = {
      per_user: [
        {
          user_id: 'u1',
          full_name: 'Ada Lovelace',
          tasks_total: 4,
          tasks_done: 3,
          tasks_completion_pct: 75,
          issues_total: 2,
          issues_open: 1,
          feedback_total: 1,
          notes_total: 0,
        },
      ],
      totals: {
        users: 1,
        tasks_total: 4,
        tasks_done: 3,
        tasks_completion_pct: 75,
        issues_total: 2,
        issues_open: 1,
        feedback_total: 1,
        notes_total: 0,
      },
    };
    const pages = await pdfPageTexts(await renderPdf(model([], { summary })));

    expect(pages[0]).toContain('Summary');
    expect(pages[0]).toContain('Total (1 person)');
  });

  it('states how much admin-only feedback was withheld', async () => {
    const pages = await pdfPageTexts(await renderPdf(model([], { withheld: { feedback: 2 } })));

    expect(pages[0]).toContain('2 admin-only feedback entries are excluded');
  });

  // NFR-03: a 1 000-row report renders in under 5 s. The row cap is 10 000 per
  // section, so this is the size a real probation-review export reaches.
  it('renders a 1 000-row report inside the performance budget', async () => {
    const rows = Array.from({ length: 1000 }, (_, index) => ({
      user: `Recruit ${index}`,
      title: `Task ${index}`,
      description: 'x'.repeat(300),
    }));

    const started = Date.now();
    const bytes = await renderPdf(model([section('tasks', ['user', 'title', 'description'], rows)]));
    const elapsed = Date.now() - started;

    expect(bytes.byteLength).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(5000);
  });

  it('renders the same bytes for the same model, so output can be compared', async () => {
    const input = model([section('tasks', ['user', 'title'], [{ user: 'Ada', title: 'Set up laptop' }])]);
    const [first, second] = [await renderPdf(input), await renderPdf(input)];

    expect(Buffer.from(second).equals(Buffer.from(first))).toBe(true);
  });
});
