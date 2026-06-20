import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createFeedbackSchema, updateFeedbackSchema } from '@onboarding-diary/shared';
import { Prisma } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.FeedbackWhereInput = { userId: req.user!.userId };

    if (req.query.type) {
      where.type = req.query.type as Prisma.EnumFeedbackTypeFilter;
    }

    const [data, total] = await Promise.all([
      prisma.feedback.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.feedback.count({ where }),
    ]);

    res.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('List feedback error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', validate(createFeedbackSchema), async (req: Request, res: Response) => {
  try {
    const { date, subject, type, details } = req.body;

    const feedback = await prisma.feedback.create({
      data: {
        userId: req.user!.userId,
        date: new Date(date),
        subject,
        type,
        details,
      },
    });

    res.status(201).json(feedback);
  } catch (err) {
    console.error('Create feedback error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const feedback = await prisma.feedback.findUnique({ where: { id: req.params.id } });

    if (!feedback) {
      res.status(404).json({ error: 'Feedback not found' });
      return;
    }
    if (feedback.userId !== req.user!.userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json(feedback);
  } catch (err) {
    console.error('Get feedback error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', validate(updateFeedbackSchema), async (req: Request, res: Response) => {
  try {
    const feedback = await prisma.feedback.findUnique({ where: { id: req.params.id } });

    if (!feedback) {
      res.status(404).json({ error: 'Feedback not found' });
      return;
    }
    if (feedback.userId !== req.user!.userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (req.body.date !== undefined) updateData.date = new Date(req.body.date);
    if (req.body.subject !== undefined) updateData.subject = req.body.subject;
    if (req.body.type !== undefined) updateData.type = req.body.type;
    if (req.body.details !== undefined) updateData.details = req.body.details;

    const updated = await prisma.feedback.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json(updated);
  } catch (err) {
    console.error('Update feedback error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const feedback = await prisma.feedback.findUnique({ where: { id: req.params.id } });

    if (!feedback) {
      res.status(404).json({ error: 'Feedback not found' });
      return;
    }
    if (feedback.userId !== req.user!.userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    await prisma.feedback.delete({ where: { id: req.params.id } });

    res.json({ message: 'Feedback deleted successfully' });
  } catch (err) {
    console.error('Delete feedback error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
