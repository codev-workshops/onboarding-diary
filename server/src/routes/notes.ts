import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createNoteSchema, updateNoteSchema } from '@onboarding-diary/shared';
import { Prisma } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get('/', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.NoteWhereInput = { userId: req.user!.userId };

    if (req.query.tags) {
      const tags = (req.query.tags as string).split(',').map(t => t.trim()).filter(Boolean);
      if (tags.length > 0) {
        where.tags = { hasSome: tags };
      }
    }

    const [data, total] = await Promise.all([
      prisma.note.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.note.count({ where }),
    ]);

    res.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('List notes error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', validate(createNoteSchema), async (req: Request, res: Response) => {
  try {
    const { date, title, content, tags } = req.body;

    const note = await prisma.note.create({
      data: {
        userId: req.user!.userId,
        date: new Date(date),
        title,
        content,
        tags: tags ?? [],
      },
    });

    res.status(201).json(note);
  } catch (err) {
    console.error('Create note error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const note = await prisma.note.findUnique({ where: { id: req.params.id } });

    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    if (note.userId !== req.user!.userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json(note);
  } catch (err) {
    console.error('Get note error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', validate(updateNoteSchema), async (req: Request, res: Response) => {
  try {
    const note = await prisma.note.findUnique({ where: { id: req.params.id } });

    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    if (note.userId !== req.user!.userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (req.body.date !== undefined) updateData.date = new Date(req.body.date);
    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.content !== undefined) updateData.content = req.body.content;
    if (req.body.tags !== undefined) updateData.tags = req.body.tags;

    const updated = await prisma.note.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json(updated);
  } catch (err) {
    console.error('Update note error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const note = await prisma.note.findUnique({ where: { id: req.params.id } });

    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    if (note.userId !== req.user!.userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    await prisma.note.delete({ where: { id: req.params.id } });

    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    console.error('Delete note error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
