/** PDF renderer: cover block plus one table per requested section (TRD 4.6). */

import PDFDocument from 'pdfkit';

import {
  EMPTY_SECTION_TEXT,
  REPORT_SECTION_HEADERS,
  reportSectionCounts,
  reportSectionRows,
  type ReportData,
} from './assemble.js';

const MARGIN = 40;
const FONT_SIZE = 9;

export function renderPdf(data: ReportData): Promise<Buffer> {
  const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });
  const chunks: Buffer[] = [];

  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  doc.fontSize(18).text('Onboarding Diary Report');
  doc.moveDown(0.5);
  doc.fontSize(11).text(data.owner.fullName);
  doc.fontSize(FONT_SIZE);
  doc.text(`Department: ${data.owner.department ?? 'Not set'}`);
  doc.text(`Start date: ${data.owner.startDate ?? 'Not set'}`);
  doc.text(`Range: ${data.from} to ${data.to}`);
  doc.text(`Generated: ${data.generatedAt.toISOString()}`);
  doc.moveDown(0.5);
  for (const { section, count } of reportSectionCounts(data)) {
    doc.text(`${section}: ${count}`);
  }

  for (const section of data.sections) {
    doc.moveDown(1);
    doc.fontSize(13).text(section);
    doc.fontSize(FONT_SIZE);
    doc.text(REPORT_SECTION_HEADERS[section].join(' | '));
    const rows = reportSectionRows(data, section);
    if (rows.length === 0) {
      doc.text(EMPTY_SECTION_TEXT);
      continue;
    }
    for (const row of rows) doc.text(row.join(' | '));
  }

  doc.end();
  return finished;
}
