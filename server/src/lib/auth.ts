import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import type { PublicUser, Role, UserRow } from './types.js';
import { toPublicUser } from './types.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-only-onboarding-diary-secret';
const TOKEN_TTL = '12h';

export interface TokenPayload {
  sub: number;
  role: Role;
}

export const signToken = (user: PublicUser): string =>
  jwt.sign({ sub: user.id, role: user.role } satisfies TokenPayload, JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  });

export interface AuthedRequest extends Request {
  user?: PublicUser;
}

const findUser = (id: number): UserRow | undefined =>
  db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;

export const requireAuth = (req: AuthedRequest, res: Response, next: NextFunction): void => {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    const payload = jwt.verify(
      header.slice('Bearer '.length),
      JWT_SECRET,
    ) as unknown as TokenPayload;
    const row = findUser(payload.sub);
    if (!row) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    req.user = toPublicUser(row);
    next();
  } catch {
    res.status(401).json({ error: 'Your session has expired, please sign in again' });
  }
};

export const requireRole =
  (...roles: ReadonlyArray<Role>) =>
  (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'You do not have access to this resource' });
      return;
    }
    next();
  };

/**
 * User ids whose entries the actor may read: recruits see their own, managers see
 * their own plus their direct reports, admins see everyone.
 */
export const visibleUserIds = (actor: PublicUser): number[] => {
  if (actor.role === 'admin') {
    const rows = db.prepare('SELECT id FROM users').all() as Array<{ id: number }>;
    return rows.map((row) => row.id);
  }
  if (actor.role === 'manager') {
    const rows = db.prepare('SELECT id FROM users WHERE manager_id = ?').all(actor.id) as Array<{
      id: number;
    }>;
    return [actor.id, ...rows.map((row) => row.id)];
  }
  return [actor.id];
};

export const canWriteFor = (actor: PublicUser, targetUserId: number): boolean =>
  actor.role === 'admin' || actor.id === targetUserId;
