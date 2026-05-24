import PDFDocument from 'pdfkit';
import type {
  ReportGeneratedData,
  TaskReportEntry,
  IssueReportEntry,
  FeedbackReportEntry,
} from '@onboarding-diary/shared';

const COLORS = {
  primary: '#1a365d',
  secondary: '#2d3748',
  accent: '#3182ce',
  muted: '#718096',
  light: '#e2e8f0',
} as const;

function addHeader(doc: PDFKit.PDFDocument, data: ReportGeneratedData): void {
  doc
    .fontSize(22)
    .fillColor(COLORS.primary)
    .text('Onboarding Diary Report', { align: 'center' });

  doc.moveDown(0.3);
  doc.fontSize(14).fillColor(COLORS.accent).text(data.recruit_name, { align: 'center' });

  doc.moveDown(0.3);
  doc
    .fontSize(10)
    .fillColor(COLORS.muted)
    .text(`Period: ${data.period_start} to ${data.period_end}`, { align: 'center' });
  doc.text(`Generated: ${new Date(data.generated_at).toLocaleDateString()}`, { align: 'center' });
  doc.text(`Type: ${data.content_type}`, { align: 'center' });

  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(COLORS.light).stroke();
  doc.moveDown(0.5);
}

function addSectionTitle(doc: PDFKit.PDFDocument, title: string): void {
  doc.moveDown(0.5);
  doc.fontSize(16).fillColor(COLORS.primary).text(title);
  doc.moveDown(0.3);
}

function addStatRow(doc: PDFKit.PDFDocument, label: string, value: string | number): void {
  const y = doc.y;
  doc.fontSize(10).fillColor(COLORS.muted).text(label, 60, y, { width: 200 });
  doc.fontSize(10).fillColor(COLORS.secondary).text(String(value), 260, y);
  doc.moveDown(0.2);
}

function addTasksSection(doc: PDFKit.PDFDocument, tasks: { total: number; completed: number; in_progress: number; pending: number; blocked: number; completion_rate: number; overdue: number; entries: TaskReportEntry[] }): void {
  addSectionTitle(doc, 'Tasks Summary');

  addStatRow(doc, 'Total Tasks', tasks.total);
  addStatRow(doc, 'Completed', tasks.completed);
  addStatRow(doc, 'In Progress', tasks.in_progress);
  addStatRow(doc, 'Pending', tasks.pending);
  addStatRow(doc, 'Blocked', tasks.blocked);
  addStatRow(doc, 'Completion Rate', `${tasks.completion_rate}%`);
  addStatRow(doc, 'Overdue', tasks.overdue);

  if (tasks.entries.length > 0) {
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor(COLORS.secondary).text('Task Details');
    doc.moveDown(0.3);

    // Table header
    const tableTop = doc.y;
    doc.fontSize(8).fillColor(COLORS.primary);
    doc.text('Title', 60, tableTop, { width: 180 });
    doc.text('Status', 245, tableTop, { width: 70 });
    doc.text('Priority', 320, tableTop, { width: 60 });
    doc.text('Due', 385, tableTop, { width: 70 });
    doc.text('Created', 460, tableTop, { width: 80 });

    doc.moveDown(0.3);
    doc.moveTo(60, doc.y).lineTo(545, doc.y).strokeColor(COLORS.light).stroke();
    doc.moveDown(0.2);

    for (const entry of tasks.entries.slice(0, 30)) {
      if (doc.y > 700) {
        doc.addPage();
      }
      const rowY = doc.y;
      doc.fontSize(8).fillColor(COLORS.secondary);
      doc.text(entry.title.substring(0, 40), 60, rowY, { width: 180 });
      doc.text(entry.status, 245, rowY, { width: 70 });
      doc.text(entry.priority, 320, rowY, { width: 60 });
      doc.text(entry.due_date ? entry.due_date.substring(0, 10) : '-', 385, rowY, { width: 70 });
      doc.text(entry.created_at.substring(0, 10), 460, rowY, { width: 80 });
      doc.moveDown(0.3);
    }
  }
}

function addIssuesSection(doc: PDFKit.PDFDocument, issues: { total: number; open: number; in_progress: number; resolved: number; closed: number; critical: number; high: number; avg_resolution_hours: number | null; entries: IssueReportEntry[] }): void {
  addSectionTitle(doc, 'Issues Summary');

  addStatRow(doc, 'Total Issues', issues.total);
  addStatRow(doc, 'Open', issues.open);
  addStatRow(doc, 'In Progress', issues.in_progress);
  addStatRow(doc, 'Resolved', issues.resolved);
  addStatRow(doc, 'Closed', issues.closed);
  addStatRow(doc, 'Critical', issues.critical);
  addStatRow(doc, 'High', issues.high);
  if (issues.avg_resolution_hours !== null) {
    addStatRow(doc, 'Avg Resolution Time', `${issues.avg_resolution_hours}h`);
  }

  if (issues.entries.length > 0) {
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor(COLORS.secondary).text('Issue Details');
    doc.moveDown(0.3);

    const tableTop = doc.y;
    doc.fontSize(8).fillColor(COLORS.primary);
    doc.text('Title', 60, tableTop, { width: 180 });
    doc.text('Severity', 245, tableTop, { width: 60 });
    doc.text('Status', 310, tableTop, { width: 70 });
    doc.text('Resolved', 385, tableTop, { width: 70 });
    doc.text('Created', 460, tableTop, { width: 80 });

    doc.moveDown(0.3);
    doc.moveTo(60, doc.y).lineTo(545, doc.y).strokeColor(COLORS.light).stroke();
    doc.moveDown(0.2);

    for (const entry of issues.entries.slice(0, 30)) {
      if (doc.y > 700) {
        doc.addPage();
      }
      const rowY = doc.y;
      doc.fontSize(8).fillColor(COLORS.secondary);
      doc.text(entry.title.substring(0, 40), 60, rowY, { width: 180 });
      doc.text(entry.severity, 245, rowY, { width: 60 });
      doc.text(entry.status, 310, rowY, { width: 70 });
      doc.text(entry.resolved_at ? entry.resolved_at.substring(0, 10) : '-', 385, rowY, { width: 70 });
      doc.text(entry.created_at.substring(0, 10), 460, rowY, { width: 80 });
      doc.moveDown(0.3);
    }
  }
}

function addFeedbackSection(doc: PDFKit.PDFDocument, feedback: { total: number; received: number; given: number; avg_rating: number | null; by_type: { type: string; count: number }[]; entries: FeedbackReportEntry[] }): void {
  addSectionTitle(doc, 'Feedback Summary');

  addStatRow(doc, 'Total Feedback', feedback.total);
  addStatRow(doc, 'Received', feedback.received);
  addStatRow(doc, 'Given', feedback.given);
  if (feedback.avg_rating !== null) {
    addStatRow(doc, 'Avg Rating', feedback.avg_rating);
  }
  for (const bt of feedback.by_type) {
    addStatRow(doc, `  ${bt.type}`, bt.count);
  }

  if (feedback.entries.length > 0) {
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor(COLORS.secondary).text('Feedback Details');
    doc.moveDown(0.3);

    const tableTop = doc.y;
    doc.fontSize(8).fillColor(COLORS.primary);
    doc.text('Title', 60, tableTop, { width: 140 });
    doc.text('Type', 205, tableTop, { width: 70 });
    doc.text('Rating', 280, tableTop, { width: 40 });
    doc.text('Author', 325, tableTop, { width: 80 });
    doc.text('Subject', 410, tableTop, { width: 80 });
    doc.text('Date', 495, tableTop, { width: 50 });

    doc.moveDown(0.3);
    doc.moveTo(60, doc.y).lineTo(545, doc.y).strokeColor(COLORS.light).stroke();
    doc.moveDown(0.2);

    for (const entry of feedback.entries.slice(0, 30)) {
      if (doc.y > 700) {
        doc.addPage();
      }
      const rowY = doc.y;
      doc.fontSize(8).fillColor(COLORS.secondary);
      doc.text(entry.title.substring(0, 30), 60, rowY, { width: 140 });
      doc.text(entry.type, 205, rowY, { width: 70 });
      doc.text(entry.rating !== null ? String(entry.rating) : '-', 280, rowY, { width: 40 });
      doc.text(entry.author_name.substring(0, 15), 325, rowY, { width: 80 });
      doc.text(entry.subject_name.substring(0, 15), 410, rowY, { width: 80 });
      doc.text(entry.created_at.substring(0, 10), 495, rowY, { width: 50 });
      doc.moveDown(0.3);
    }
  }
}

export function generatePdf(data: ReportGeneratedData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    addHeader(doc, data);

    if (data.tasks) {
      addTasksSection(doc, data.tasks);
    }

    if (data.issues) {
      if (data.tasks) doc.addPage();
      addIssuesSection(doc, data.issues);
    }

    if (data.feedback) {
      if (data.tasks || data.issues) doc.addPage();
      addFeedbackSection(doc, data.feedback);
    }

    // Footer on each page
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc
        .fontSize(8)
        .fillColor(COLORS.muted)
        .text(`Page ${i + 1} of ${pageCount}`, 50, 770, { align: 'center', width: 495 });
    }

    doc.end();
  });
}
