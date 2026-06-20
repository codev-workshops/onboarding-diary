import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import PDFDocument from 'pdfkit';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Parser: Json2CsvParser } = require('json2csv');

const router = Router();

router.use(authenticate);

interface ReportData {
  tasks?: Record<string, unknown>[];
  issues?: Record<string, unknown>[];
  feedback?: Record<string, unknown>[];
}

async function generateReportData(userId: string, type: string, dateFrom: Date, dateTo: Date): Promise<ReportData> {
  const dateFilter = { gte: dateFrom, lte: dateTo };
  const result: ReportData = {};

  if (type === 'tasks' || type === 'combined') {
    result.tasks = await prisma.task.findMany({
      where: { userId, date: dateFilter },
      orderBy: { date: 'asc' },
    });
  }

  if (type === 'issues' || type === 'combined') {
    result.issues = await prisma.issue.findMany({
      where: { userId, date: dateFilter },
      orderBy: { date: 'asc' },
    });
  }

  if (type === 'feedback' || type === 'combined') {
    result.feedback = await prisma.feedback.findMany({
      where: { userId, date: dateFilter },
      orderBy: { date: 'asc' },
    });
  }

  return result;
}

function buildPdf(res: Response, data: ReportData, type: string, dateFrom: string, dateTo: string): void {
  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="report-${type}.pdf"`);
  doc.pipe(res);

  doc.fontSize(20).text('Onboarding Diary Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Report Type: ${type}`);
  doc.text(`Date Range: ${dateFrom} to ${dateTo}`);
  doc.text(`Generated: ${new Date().toISOString()}`);
  doc.moveDown();

  if (data.tasks && data.tasks.length > 0) {
    doc.fontSize(16).text('Tasks', { underline: true });
    doc.moveDown(0.5);
    for (const task of data.tasks) {
      doc.fontSize(10).text(`- [${task.status}] ${task.title} (${task.category}, Priority: ${task.priority})`);
      if (task.description) {
        doc.fontSize(9).text(`  ${task.description}`);
      }
    }
    doc.moveDown();
  }

  if (data.issues && data.issues.length > 0) {
    doc.fontSize(16).text('Issues', { underline: true });
    doc.moveDown(0.5);
    for (const issue of data.issues) {
      doc.fontSize(10).text(`- [${issue.status}] ${issue.title} (Severity: ${issue.severity})`);
      if (issue.description) {
        doc.fontSize(9).text(`  ${issue.description}`);
      }
    }
    doc.moveDown();
  }

  if (data.feedback && data.feedback.length > 0) {
    doc.fontSize(16).text('Feedback', { underline: true });
    doc.moveDown(0.5);
    for (const fb of data.feedback) {
      doc.fontSize(10).text(`- [${fb.type}] ${fb.subject}`);
      if (fb.details) {
        doc.fontSize(9).text(`  ${fb.details}`);
      }
    }
    doc.moveDown();
  }

  doc.end();
}

function buildCsv(res: Response, data: ReportData, type: string): void {
  const rows: Record<string, unknown>[] = [];

  if (data.tasks) {
    for (const t of data.tasks) {
      rows.push({ section: 'Task', ...t });
    }
  }
  if (data.issues) {
    for (const i of data.issues) {
      rows.push({ section: 'Issue', ...i });
    }
  }
  if (data.feedback) {
    for (const f of data.feedback) {
      rows.push({ section: 'Feedback', ...f });
    }
  }

  if (rows.length === 0) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="report-${type}.csv"`);
    res.send('No data');
    return;
  }

  const parser = new Json2CsvParser();
  const csv = parser.parse(rows);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="report-${type}.csv"`);
  res.send(csv);
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, dateFrom, dateTo } = req.query;

    if (!type || !dateFrom || !dateTo) {
      res.status(400).json({ error: 'type, dateFrom, and dateTo query params are required' });
      return;
    }

    const data = await generateReportData(
      req.user!.userId,
      type as string,
      new Date(dateFrom as string),
      new Date(dateTo as string),
    );

    res.json(data);
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/download', async (req: Request, res: Response) => {
  try {
    const { type, dateFrom, dateTo, format } = req.query;

    if (!type || !dateFrom || !dateTo) {
      res.status(400).json({ error: 'type, dateFrom, and dateTo query params are required' });
      return;
    }

    const data = await generateReportData(
      req.user!.userId,
      type as string,
      new Date(dateFrom as string),
      new Date(dateTo as string),
    );

    if (format === 'csv') {
      buildCsv(res, data, type as string);
    } else {
      buildPdf(res, data, type as string, dateFrom as string, dateTo as string);
    }
  } catch (err) {
    console.error('Report download error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/recruits/:userId', async (req: Request, res: Response) => {
  try {
    const managerId = req.user!.userId;
    const recruitId = req.params.userId;

    const recruit = await prisma.user.findUnique({ where: { id: recruitId } });
    if (!recruit) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (recruit.managerId !== managerId) {
      res.status(403).json({ error: 'You are not the manager of this recruit' });
      return;
    }

    const { type, dateFrom, dateTo } = req.query;

    if (!type || !dateFrom || !dateTo) {
      res.status(400).json({ error: 'type, dateFrom, and dateTo query params are required' });
      return;
    }

    const data = await generateReportData(
      recruitId,
      type as string,
      new Date(dateFrom as string),
      new Date(dateTo as string),
    );

    res.json(data);
  } catch (err) {
    console.error('Recruit report error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/recruits/:userId/download', async (req: Request, res: Response) => {
  try {
    const managerId = req.user!.userId;
    const recruitId = req.params.userId;

    const recruit = await prisma.user.findUnique({ where: { id: recruitId } });
    if (!recruit) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (recruit.managerId !== managerId) {
      res.status(403).json({ error: 'You are not the manager of this recruit' });
      return;
    }

    const { type, dateFrom, dateTo, format } = req.query;

    if (!type || !dateFrom || !dateTo) {
      res.status(400).json({ error: 'type, dateFrom, and dateTo query params are required' });
      return;
    }

    const data = await generateReportData(
      recruitId,
      type as string,
      new Date(dateFrom as string),
      new Date(dateTo as string),
    );

    if (format === 'csv') {
      buildCsv(res, data, type as string);
    } else {
      buildPdf(res, data, type as string, dateFrom as string, dateTo as string);
    }
  } catch (err) {
    console.error('Recruit report download error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
