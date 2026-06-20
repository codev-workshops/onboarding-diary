import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '@onboarding-diary/shared';
import { Prisma } from '@prisma/client';

const router = Router();

router.use(authenticate, authorize(UserRole.ADMIN));

router.get('/users', async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};

    if (req.query.role) {
      where.role = req.query.role as Prisma.EnumUserRoleFilter;
    }

    if (req.query.search) {
      const search = req.query.search as string;
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          department: true,
          startDate: true,
          managerId: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Admin list users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        startDate: true,
        managerId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (err) {
    console.error('Admin get user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/users/:id/role', async (req: Request, res: Response) => {
  try {
    const { role } = req.body;

    if (!role || !Object.values(UserRole).includes(role)) {
      res.status(400).json({ error: 'Valid role is required' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        startDate: true,
        managerId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error('Admin update role error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/users/:id/manager', async (req: Request, res: Response) => {
  try {
    const { managerId } = req.body;

    if (managerId !== null && managerId !== undefined) {
      const manager = await prisma.user.findUnique({ where: { id: managerId } });
      if (!manager) {
        res.status(404).json({ error: 'Manager not found' });
        return;
      }
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { managerId: managerId ?? null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        startDate: true,
        managerId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error('Admin assign manager error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/users/:id/deactivate', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        department: true,
        startDate: true,
        managerId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error('Admin deactivate error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
