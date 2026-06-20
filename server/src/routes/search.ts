import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const q = (req.query.q as string || '').trim();

    if (!q || q.length < 2) {
      res.status(400).json({ error: 'Search query must be at least 2 characters' });
      return;
    }

    const contains = q;

    const [tasks, issues, feedback, notes] = await Promise.all([
      prisma.task.findMany({
        where: {
          userId,
          OR: [
            { title: { contains, mode: 'insensitive' } },
            { description: { contains, mode: 'insensitive' } },
          ],
        },
        orderBy: { date: 'desc' },
        take: 10,
      }),
      prisma.issue.findMany({
        where: {
          userId,
          OR: [
            { title: { contains, mode: 'insensitive' } },
            { description: { contains, mode: 'insensitive' } },
            { resolutionNotes: { contains, mode: 'insensitive' } },
          ],
        },
        orderBy: { date: 'desc' },
        take: 10,
      }),
      prisma.feedback.findMany({
        where: {
          userId,
          OR: [
            { subject: { contains, mode: 'insensitive' } },
            { details: { contains, mode: 'insensitive' } },
          ],
        },
        orderBy: { date: 'desc' },
        take: 10,
      }),
      prisma.note.findMany({
        where: {
          userId,
          OR: [
            { title: { contains, mode: 'insensitive' } },
            { content: { contains, mode: 'insensitive' } },
          ],
        },
        orderBy: { date: 'desc' },
        take: 10,
      }),
    ]);

    res.json({
      tasks: tasks.map((t) => ({ ...t, _type: 'task' as const })),
      issues: issues.map((i) => ({ ...i, _type: 'issue' as const })),
      feedback: feedback.map((f) => ({ ...f, _type: 'feedback' as const })),
      notes: notes.map((n) => ({ ...n, _type: 'note' as const })),
      total: tasks.length + issues.length + feedback.length + notes.length,
    });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
