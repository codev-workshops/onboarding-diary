import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createTaskSchema, updateTaskSchema } from '@onboarding-diary/shared';
import { Prisma } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.TaskWhereInput = { userId: req.user!.userId };

    if (req.query.date_from) {
      where.date = { ...where.date as Prisma.DateTimeFilter, gte: new Date(req.query.date_from as string) };
    }
    if (req.query.date_to) {
      where.date = { ...where.date as Prisma.DateTimeFilter, lte: new Date(req.query.date_to as string) };
    }
    if (req.query.category) {
      where.category = req.query.category as Prisma.EnumTaskCategoryFilter;
    }
    if (req.query.status) {
      where.status = req.query.status as Prisma.EnumTaskStatusFilter;
    }

    const [data, total] = await Promise.all([
      prisma.task.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.task.count({ where }),
    ]);

    res.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('List tasks error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', validate(createTaskSchema), async (req: Request, res: Response) => {
  try {
    const { date, title, description, category, status, priority } = req.body;

    const task = await prisma.task.create({
      data: {
        userId: req.user!.userId,
        date: new Date(date),
        title,
        description: description ?? null,
        category,
        status,
        priority,
      },
    });

    res.status(201).json(task);
  } catch (err) {
    console.error('Create task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    if (task.userId !== req.user!.userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json(task);
  } catch (err) {
    console.error('Get task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', validate(updateTaskSchema), async (req: Request, res: Response) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    if (task.userId !== req.user!.userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (req.body.date !== undefined) updateData.date = new Date(req.body.date);
    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.category !== undefined) updateData.category = req.body.category;
    if (req.body.status !== undefined) updateData.status = req.body.status;
    if (req.body.priority !== undefined) updateData.priority = req.body.priority;

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json(updated);
  } catch (err) {
    console.error('Update task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    if (task.userId !== req.user!.userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    await prisma.task.delete({ where: { id: req.params.id } });

    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error('Delete task error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
