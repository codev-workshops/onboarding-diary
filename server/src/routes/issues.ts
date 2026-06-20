import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createIssueSchema, updateIssueSchema } from '@onboarding-diary/shared';
import { Prisma } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.IssueWhereInput = { userId: req.user!.userId };

    if (req.query.status) {
      where.status = req.query.status as Prisma.EnumIssueStatusFilter;
    }
    if (req.query.severity) {
      where.severity = req.query.severity as Prisma.EnumIssueSeverityFilter;
    }

    const [data, total] = await Promise.all([
      prisma.issue.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.issue.count({ where }),
    ]);

    res.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('List issues error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', validate(createIssueSchema), async (req: Request, res: Response) => {
  try {
    const { date, title, description, severity, status, resolutionNotes } = req.body;

    const issue = await prisma.issue.create({
      data: {
        userId: req.user!.userId,
        date: new Date(date),
        title,
        description,
        severity,
        status,
        resolutionNotes: resolutionNotes ?? null,
      },
    });

    res.status(201).json(issue);
  } catch (err) {
    console.error('Create issue error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const issue = await prisma.issue.findUnique({ where: { id: req.params.id } });

    if (!issue) {
      res.status(404).json({ error: 'Issue not found' });
      return;
    }
    if (issue.userId !== req.user!.userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json(issue);
  } catch (err) {
    console.error('Get issue error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', validate(updateIssueSchema), async (req: Request, res: Response) => {
  try {
    const issue = await prisma.issue.findUnique({ where: { id: req.params.id } });

    if (!issue) {
      res.status(404).json({ error: 'Issue not found' });
      return;
    }
    if (issue.userId !== req.user!.userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (req.body.date !== undefined) updateData.date = new Date(req.body.date);
    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.severity !== undefined) updateData.severity = req.body.severity;
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.resolutionNotes !== undefined) updateData.resolutionNotes = req.body.resolutionNotes;

    const updated = await prisma.issue.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json(updated);
  } catch (err) {
    console.error('Update issue error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const issue = await prisma.issue.findUnique({ where: { id: req.params.id } });

    if (!issue) {
      res.status(404).json({ error: 'Issue not found' });
      return;
    }
    if (issue.userId !== req.user!.userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    await prisma.issue.delete({ where: { id: req.params.id } });

    res.json({ message: 'Issue deleted successfully' });
  } catch (err) {
    console.error('Delete issue error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
