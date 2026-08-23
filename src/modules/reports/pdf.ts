import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';

import {
  type ReportColumn,
  type ReportModel,
  type ReportSectionModel,
  type ReportTotals,
  type ReportUserSummary,
} from '@/src/modules/reports/model';

/**
 * PDF rendering (§18.2).
 *
 * The PDF is a third view of the same `ReportModel` the preview and the CSV
 * read, so a row that cannot appear on screen cannot appear here either —
 * privacy is a property of the model, not of each renderer.
 *
 * Everything is drawn with pdf-lib and the 14 standard fonts: no headless
 * browser, no HTML, no image or font fetched at render time, which is what
 * SEC-14 asks for (a report cannot be made to reach out to a URL a recruit
 * typed into an issue title). The cost is that layout is manual, so the two
 * fiddly parts — wrapping text to a column width and starting a new page when
 * a row does not fit — live in `wrapCell` and `drawTable` and are unit-tested
 * directly.
 */

/** A4 portrait, 15 mm margins (§18.2). */
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42.52;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const BODY_SIZE = 7.5;
const CELL_LEADING = 9;
const CELL_PADDING = 3;
const ROW_GAP = 2;
const FOOTER_BASELINE = 24;

const INK = rgb(0.13, 0.13, 0.15);
const MUTED = rgb(0.42, 0.42, 0.47);
const RULE = rgb(0.78, 0.78, 0.82);
const ZEBRA = rgb(0.955, 0.955, 0.97);
const HEADER_FILL = rgb(0.9, 0.91, 0.94);

/**
 * §18.2: long text wraps rather than being cut, except the free-text body
 * columns, which are truncated with a footnote pointing at the CSV. A single
 * 4 000-character note would otherwise be four pages of one column.
 */
export const LONG_TEXT_COLUMNS = ['description', 'content', 'details', 'resolution_notes'];
export const LONG_TEXT_LIMIT = 500;
export const LONG_TEXT_FOOTNOTE = `Free-text columns are truncated at ${LONG_TEXT_LIMIT} characters; the CSV export carries the full text.`;

/**
 * The UUID column is dropped from the PDF only — at 36 characters it is a
 * third of the page width and unreadable on paper, and the machine-readable
 * exports still carry it.
 */
const OMITTED_COLUMNS = ['user_id'];

/** Relative widths; anything unlisted gets 1. Free text needs the room. */
const COLUMN_WEIGHTS: Record<string, number> = {
  user: 1.5,
  entry_date: 0.9,
  title: 2,
  subject: 2,
  description: 3,
  content: 3,
  details: 3,
  resolution_notes: 2,
  tags: 1.2,
  category: 1.2,
  status: 1,
  priority: 0.9,
  severity: 0.9,
  type: 1,
  visibility: 1.1,
  completed_at: 1.3,
  resolved_at: 1.3,
  updated_at: 1.3,
};

type Fonts = { regular: PDFFont; bold: PDFFont };

type Cursor = { page: PDFPage; y: number };

/**
 * The standard fonts encode WinAnsi only, and `drawText` throws on anything
 * outside it — an emoji in a task title would turn a report into a 500. Text
 * is therefore folded to what the font can draw before it reaches pdf-lib.
 */
export function sanitizeText(value: string): string {
  let out = '';

  for (const char of value.normalize('NFC')) {
    const code = char.codePointAt(0) ?? 0;

    if (char === '\n') out += '\n';
    else if (char === '\t') out += ' ';
    else if (code < 0x20 || code === 0x7f) out += ' ';
    else if (code <= 0xff) out += char;
    else if (WINANSI_EXTRAS.has(char)) out += char;
    else out += '?';
  }

  return out;
}

/** The non-Latin-1 characters WinAnsi can still encode (0x80–0x9F). */
const WINANSI_EXTRAS = new Set([
  '\u20ac',
  '\u201a',
  '\u0192',
  '\u201e',
  '\u2026',
  '\u2020',
  '\u2021',
  '\u02c6',
  '\u2030',
  '\u0160',
  '\u2039',
  '\u0152',
  '\u017d',
  '\u2018',
  '\u2019',
  '\u201c',
  '\u201d',
  '\u2022',
  '\u2013',
  '\u2014',
  '\u02dc',
  '\u2122',
  '\u0161',
  '\u203a',
  '\u0153',
  '\u017e',
  '\u0178',
]);

export function truncateLongText(key: string, value: string): string {
  if (!LONG_TEXT_COLUMNS.includes(key) || value.length <= LONG_TEXT_LIMIT) return value;
  return `${value.slice(0, LONG_TEXT_LIMIT)}\u2026`;
}

/**
 * Greedy wrap on spaces, splitting words that are wider than the column
 * (a pasted URL) so a cell can never overflow into its neighbour.
 */
export function wrapCell(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];

  for (const paragraph of text.split('\n')) {
    let line = '';

    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;

      if (font.widthOfTextAtSize(candidate, size) <= width) {
        line = candidate;
        continue;
      }

      if (line) lines.push(line);
      line = '';

      if (font.widthOfTextAtSize(word, size) <= width) {
        line = word;
        continue;
      }

      let chunk = '';
      for (const char of word) {
        if (font.widthOfTextAtSize(chunk + char, size) > width && chunk) {
          lines.push(chunk);
          chunk = char;
        } else {
          chunk += char;
        }
      }
      line = chunk;
    }

    lines.push(line);
  }

  return lines.length > 0 ? lines : [''];
}

export function columnWidths(columns: ReportColumn[], width: number): number[] {
  const weights = columns.map((column) => COLUMN_WEIGHTS[column.key] ?? 1);
  const total = weights.reduce((sum, weight) => sum + weight, 0);

  return weights.map((weight) => (weight / total) * width);
}

export function pdfColumns(section: ReportSectionModel): ReportColumn[] {
  return section.columns.filter((column) => !OMITTED_COLUMNS.includes(column.key));
}

export async function renderPdf(model: ReportModel): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };

  // §18.2 accessibility: a document title the reader's PDF viewer can show.
  // The rest of the metadata is fixed so that two renders of the same report
  // differ only where the report itself differs.
  const generatedAt = new Date(model.generated_at);
  pdf.setTitle(sanitizeText(`Onboarding report — ${model.scope.description}`));
  pdf.setSubject(sanitizeText(`${model.period.date_from} to ${model.period.date_to}`));
  pdf.setAuthor('Onboarding Diary');
  pdf.setProducer('Onboarding Diary');
  pdf.setCreator('Onboarding Diary');
  pdf.setCreationDate(generatedAt);
  pdf.setModificationDate(generatedAt);

  const cursor: Cursor = { page: newPage(pdf), y: PAGE_HEIGHT - MARGIN };

  drawCover(cursor, pdf, model, fonts);

  if (model.summary) drawSummary(cursor, pdf, model.summary.per_user, model.summary.totals, fonts);

  for (const section of model.sections) {
    // §18.2: one section per detail type, each starting on a new page.
    cursor.page = newPage(pdf);
    cursor.y = PAGE_HEIGHT - MARGIN;
    drawSection(cursor, pdf, section, fonts);
  }

  drawFooters(pdf, model, fonts);

  return pdf.save();
}

function newPage(pdf: PDFDocument): PDFPage {
  return pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
}

function text(
  cursor: Cursor,
  value: string,
  options: { font: PDFFont; size: number; color?: ReturnType<typeof rgb>; gap?: number }
): void {
  const lines = wrapCell(sanitizeText(value), options.font, options.size, CONTENT_WIDTH);

  for (const line of lines) {
    cursor.y -= options.size + 2;
    cursor.page.drawText(line, {
      x: MARGIN,
      y: cursor.y,
      size: options.size,
      font: options.font,
      color: options.color ?? INK,
    });
  }

  cursor.y -= options.gap ?? 0;
}

function drawCover(cursor: Cursor, pdf: PDFDocument, model: ReportModel, fonts: Fonts): void {
  text(cursor, 'Onboarding report', { font: fonts.bold, size: 18, gap: 4 });
  text(cursor, model.scope.description, { font: fonts.regular, size: 11, color: MUTED, gap: 8 });

  const filters = Object.entries(model.filters_applied)
    .map(([key, value]) => `${key}: ${value}`)
    .join(' · ');

  const facts: [string, string][] = [
    ['Period', `${model.period.date_from} to ${model.period.date_to} (inclusive)`],
    ['Generated at', model.generated_at],
    ['Generated by', `${model.generated_by.full_name} (${model.generated_by.role})`],
    ['People', String(model.scope.subjects.length)],
    ['Sections', model.sections_included.join(', ') || 'summary only'],
    ['Filters', filters || 'none'],
  ];

  for (const [label, value] of facts) {
    const y = (cursor.y -= 12);
    cursor.page.drawText(sanitizeText(label), {
      x: MARGIN,
      y,
      size: 8.5,
      font: fonts.bold,
      color: MUTED,
    });
    for (const [index, line] of wrapCell(
      sanitizeText(value),
      fonts.regular,
      8.5,
      CONTENT_WIDTH - 80
    ).entries()) {
      cursor.page.drawText(line, {
        x: MARGIN + 80,
        y: y - index * 10,
        size: 8.5,
        font: fonts.regular,
        color: INK,
      });
      if (index > 0) cursor.y -= 10;
    }
  }

  cursor.y -= 10;

  if (model.withheld.feedback > 0) {
    text(
      cursor,
      `${model.withheld.feedback} admin-only feedback ${
        model.withheld.feedback === 1 ? 'entry is' : 'entries are'
      } excluded from this report.`,
      { font: fonts.regular, size: 8.5, color: MUTED }
    );
  }

  text(cursor, model.confidentiality, { font: fonts.bold, size: 8.5, color: MUTED, gap: 6 });

  if (model.scope.subjects.length > 0) {
    drawTable(
      cursor,
      pdf,
      'People in this report',
      [
        { key: 'full_name', label: 'Name' },
        { key: 'role', label: 'Role' },
        { key: 'department', label: 'Department' },
        { key: 'start_date', label: 'Start date' },
      ],
      model.scope.subjects.map((subject) => ({
        full_name: subject.full_name,
        role: subject.role,
        department: subject.department ?? '',
        start_date: subject.start_date,
      })),
      fonts
    );
  }
}

function drawSummary(
  cursor: Cursor,
  pdf: PDFDocument,
  perUser: ReportUserSummary[],
  totals: ReportTotals,
  fonts: Fonts
): void {
  const columns: ReportColumn[] = [
    { key: 'full_name', label: 'User' },
    { key: 'tasks_total', label: 'Tasks' },
    { key: 'tasks_done', label: 'Done' },
    { key: 'tasks_completion_pct', label: 'Done %' },
    { key: 'issues_total', label: 'Issues' },
    { key: 'issues_open', label: 'Open' },
    { key: 'feedback_total', label: 'Feedback' },
    { key: 'notes_total', label: 'Notes' },
  ];

  const rows = perUser.map((row) => ({
    full_name: row.full_name,
    tasks_total: row.tasks_total,
    tasks_done: row.tasks_done,
    tasks_completion_pct: row.tasks_completion_pct,
    issues_total: row.issues_total,
    issues_open: row.issues_open,
    feedback_total: row.feedback_total,
    notes_total: row.notes_total,
  }));

  rows.push({
    full_name: `Total (${totals.users} ${totals.users === 1 ? 'person' : 'people'})`,
    tasks_total: totals.tasks_total,
    tasks_done: totals.tasks_done,
    tasks_completion_pct: totals.tasks_completion_pct,
    issues_total: totals.issues_total,
    issues_open: totals.issues_open,
    feedback_total: totals.feedback_total,
    notes_total: totals.notes_total,
  });

  drawTable(cursor, pdf, 'Summary', columns, rows, fonts);
}

function drawSection(cursor: Cursor, pdf: PDFDocument, section: ReportSectionModel, fonts: Fonts): void {
  const columns = pdfColumns(section);
  const truncated = section.rows.some((row) =>
    LONG_TEXT_COLUMNS.some((key) => String(row[key] ?? '').length > LONG_TEXT_LIMIT)
  );

  drawTable(
    cursor,
    pdf,
    `${section.label} (${section.row_count})`,
    columns,
    section.rows,
    fonts,
    truncated ? LONG_TEXT_FOOTNOTE : null
  );
}

function drawTable(
  cursor: Cursor,
  pdf: PDFDocument,
  heading: string,
  columns: ReportColumn[],
  rows: Record<string, string | number | null>[],
  fonts: Fonts,
  footnote: string | null = null
): void {
  if (cursor.y < MARGIN + 120) startPage(cursor, pdf);

  text(cursor, heading, { font: fonts.bold, size: 11, gap: 4 });

  const widths = columnWidths(columns, CONTENT_WIDTH);
  const drawHeader = () => {
    const height = CELL_LEADING + CELL_PADDING * 2;
    cursor.page.drawRectangle({
      x: MARGIN,
      y: cursor.y - height,
      width: CONTENT_WIDTH,
      height,
      color: HEADER_FILL,
    });

    let x = MARGIN;
    for (const [index, column] of columns.entries()) {
      cursor.page.drawText(sanitizeText(column.label), {
        x: x + CELL_PADDING,
        y: cursor.y - CELL_PADDING - BODY_SIZE,
        size: BODY_SIZE,
        font: fonts.bold,
        color: INK,
        maxWidth: widths[index] - CELL_PADDING * 2,
      });
      x += widths[index];
    }

    cursor.y -= height;
  };

  drawHeader();

  if (rows.length === 0) {
    text(cursor, 'No rows.', { font: fonts.regular, size: 8, color: MUTED, gap: 6 });
    return;
  }

  for (const [index, row] of rows.entries()) {
    const cells = columns.map((column, columnIndex) =>
      wrapCell(
        sanitizeText(truncateLongText(column.key, String(row[column.key] ?? ''))),
        fonts.regular,
        BODY_SIZE,
        widths[columnIndex] - CELL_PADDING * 2
      )
    );

    const lines = Math.max(...cells.map((cell) => cell.length));
    const height = lines * CELL_LEADING + CELL_PADDING * 2;

    // §18.2: the header repeats whenever a table spills onto the next page.
    if (cursor.y - height < MARGIN + FOOTER_BASELINE) {
      startPage(cursor, pdf);
      drawHeader();
    }

    if (index % 2 === 1) {
      cursor.page.drawRectangle({
        x: MARGIN,
        y: cursor.y - height,
        width: CONTENT_WIDTH,
        height,
        color: ZEBRA,
      });
    }

    let x = MARGIN;
    for (const [columnIndex, cell] of cells.entries()) {
      for (const [lineIndex, line] of cell.entries()) {
        cursor.page.drawText(line, {
          x: x + CELL_PADDING,
          y: cursor.y - CELL_PADDING - BODY_SIZE - lineIndex * CELL_LEADING,
          size: BODY_SIZE,
          font: fonts.regular,
          color: INK,
        });
      }
      x += widths[columnIndex];
    }

    cursor.y -= height;
    cursor.page.drawLine({
      start: { x: MARGIN, y: cursor.y },
      end: { x: MARGIN + CONTENT_WIDTH, y: cursor.y },
      thickness: 0.4,
      color: RULE,
    });
    cursor.y -= ROW_GAP;
  }

  if (footnote) text(cursor, footnote, { font: fonts.regular, size: 7, color: MUTED, gap: 6 });
}

function startPage(cursor: Cursor, pdf: PDFDocument): void {
  cursor.page = newPage(pdf);
  cursor.y = PAGE_HEIGHT - MARGIN;
}

/**
 * §18.2 wants the report id, the generation time and "page N of M" on every
 * page, and M is only known once the last row is drawn — so footers are a
 * final pass over the finished document.
 */
function drawFooters(pdf: PDFDocument, model: ReportModel, fonts: Fonts): void {
  const pages = pdf.getPages();

  for (const [index, page] of pages.entries()) {
    const left = sanitizeText(`Report ${model.report_id} · generated ${model.generated_at}`);
    const right = sanitizeText(`Page ${index + 1} of ${pages.length}`);

    page.drawLine({
      start: { x: MARGIN, y: FOOTER_BASELINE + 12 },
      end: { x: PAGE_WIDTH - MARGIN, y: FOOTER_BASELINE + 12 },
      thickness: 0.4,
      color: RULE,
    });
    page.drawText(left, {
      x: MARGIN,
      y: FOOTER_BASELINE,
      size: 7,
      font: fonts.regular,
      color: MUTED,
    });
    page.drawText(right, {
      x: PAGE_WIDTH - MARGIN - fonts.regular.widthOfTextAtSize(right, 7),
      y: FOOTER_BASELINE,
      size: 7,
      font: fonts.regular,
      color: MUTED,
    });
  }
}
