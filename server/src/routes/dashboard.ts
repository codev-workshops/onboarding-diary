import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/summary', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const [totalTasks, completedTasks, openIssues, feedbackCount, notesCount] = await Promise.all([
      prisma.task.count({ where: { userId } }),
      prisma.task.count({ where: { userId, status: 'COMPLETED' } }),
      prisma.issue.count({ where: { userId, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.feedback.count({ where: { userId } }),
      prisma.note.count({ where: { userId } }),
    ]);

    res.json({ totalTasks, completedTasks, openIssues, feedbackCount, notesCount });
  } catch (err) {
    console.error('Dashboard summary error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/recent', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const [tasks, issues, feedback, notes] = await Promise.all([
      prisma.task.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.issue.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.feedback.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.note.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

    res.json({ tasks, issues, feedback, notes });
  } catch (err) {
    console.error('Dashboard recent error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
