import type { ReportModel, ReportSectionModel } from '@/src/modules/reports/model';

/**
 * CSV rendering (§18.2).
 *
 * Three properties matter and each is easy to get wrong:
 *
 *  1. **RFC 4180 quoting.** A field containing a comma, a quote or a newline is
 *     quoted and its quotes doubled. A diary entry contains all three.
 *  2. **Formula injection.** A cell beginning `=`, `+`, `-`, `@`, tab or CR is
 *     executed by Excel and Sheets when the file is opened, so
 *     `=HYPERLINK(...)` in an issue title becomes a phishing link in the
 *     manager's spreadsheet. Such cells are prefixed with an apostrophe, which
 *     the spreadsheet strips on display (SEC-13).
 *  3. **A single shape.** A combined report is one file with a leading
 *     `record_type` column and the union of the sections' columns, rather than
 *     several files or several header rows in one file — the latter is what
 *     breaks every consumer that reads a CSV as a table.
 */

const BOM = '\uFEFF';
const CRLF = '\r\n';
const RISKY_PREFIX = /^[=+\-@\t\r]/;

export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';

  const raw = String(value);
  const guarded = RISKY_PREFIX.test(raw) ? `'${raw}` : raw;

  return /[",\r\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

export function renderCsv(model: ReportModel): string {
  const sections = model.sections;

  // No details requested, or no section produced rows: an empty file with a
  // header is still a valid answer, and a zero-byte download is not.
  if (sections.length === 0) return `${BOM}record_type${CRLF}`;

  const combined = sections.length > 1;
  const columns = columnsFor(sections, combined);
  const header = columns.map((column) => escapeCsvCell(column)).join(',');

  const lines = [header];
  for (const section of sections) {
    for (const row of section.rows) {
      const values = columns.map((column) =>
        column === 'record_type' ? escapeCsvCell(section.key) : escapeCsvCell(row[column] ?? null)
      );
      lines.push(values.join(','));
    }
  }

  return BOM + lines.join(CRLF) + CRLF;
}

function columnsFor(sections: ReportSectionModel[], combined: boolean): string[] {
  const columns = combined ? ['record_type'] : [];

  for (const section of sections) {
    for (const column of section.columns) {
      if (!columns.includes(column.key)) columns.push(column.key);
    }
  }

  return columns;
}

/**
 * `Content-Disposition` carries the name twice (API-14): the plain `filename`
 * for clients that read only that, and RFC 5987 `filename*` for anything
 * non-ASCII a department or person's name might contain.
 */
export function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
