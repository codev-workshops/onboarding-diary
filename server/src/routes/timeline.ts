import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

interface TimelineEntry {
  id: string;
  type: 'task' | 'issue' | 'feedback' | 'note';
  title: string;
  subtitle: string;
  date: Date;
  createdAt: Date;
  metadata: Record<string, string>;
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);

    const [tasks, issues, feedback, notes] = await Promise.all([
      prisma.task.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.issue.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.feedback.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.note.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
    ]);

    const entries: TimelineEntry[] = [];

    for (const t of tasks) {
      entries.push({
        id: t.id,
        type: 'task',
        title: t.title,
        subtitle: t.description || '',
        date: t.date,
        createdAt: t.createdAt,
        metadata: { category: t.category, status: t.status, priority: t.priority },
      });
    }

    for (const i of issues) {
      entries.push({
        id: i.id,
        type: 'issue',
        title: i.title,
        subtitle: i.description,
        date: i.date,
        createdAt: i.createdAt,
        metadata: { severity: i.severity, status: i.status },
      });
    }

    for (const f of feedback) {
      entries.push({
        id: f.id,
        type: 'feedback',
        title: f.subject,
        subtitle: f.details,
        date: f.date,
        createdAt: f.createdAt,
        metadata: { type: f.type },
      });
    }

    for (const n of notes) {
      entries.push({
        id: n.id,
        type: 'note',
        title: n.title,
        subtitle: n.content.slice(0, 150),
        date: n.date,
        createdAt: n.createdAt,
        metadata: { tags: n.tags.join(', ') },
      });
    }

    entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    res.json(entries.slice(0, limit));
  } catch (err) {
    console.error('Timeline error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
