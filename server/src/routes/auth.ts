import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import type { AuthedRequest } from '../lib/auth.js';
import { requireAuth, signToken } from '../lib/auth.js';
import type { UserRow } from '../lib/types.js';
import { toPublicUser } from '../lib/types.js';

const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
  password: z.string().min(8, 'Please use a password of at least 8 characters'),
  name: z.string().trim().min(1, 'Please enter your name'),
  role: z.enum(['recruit', 'manager', 'admin']).default('recruit'),
  department: z.string().trim().default(''),
  startDate: z.string().trim().default(''),
  managerId: z.number().int().positive().nullable().default(null),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
  password: z.string().min(1, 'Please enter your password'),
});

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Please enter your name'),
  department: z.string().trim().default(''),
  startDate: z.string().trim().default(''),
  managerId: z.number().int().positive().nullable().default(null),
});

export const authRouter = Router();

authRouter.post('/signup', (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Please check the form' });
    return;
  }
  const input = parsed.data;
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(input.email);
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists' });
    return;
  }
  const info = db
    .prepare(
      `INSERT INTO users (email, password_hash, name, role, department, start_date, manager_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.email,
      bcrypt.hashSync(input.password, 10),
      input.name,
      input.role,
      input.department,
      input.startDate,
      input.managerId,
    );
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid) as UserRow;
  const user = toPublicUser(row);
  res.status(201).json({ token: signToken(user), user });
});

authRouter.post('/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Please check the form' });
    return;
  }
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(parsed.data.email) as
    | UserRow
    | undefined;
  if (!row || !bcrypt.compareSync(parsed.data.password, row.password_hash)) {
    res.status(401).json({ error: 'Please check your email and password and try again' });
    return;
  }
  const user = toPublicUser(row);
  res.json({ token: signToken(user), user });
});

authRouter.get('/me', requireAuth, (req: AuthedRequest, res) => {
  res.json({ user: req.user });
});

authRouter.patch('/me', requireAuth, (req: AuthedRequest, res) => {
  const actor = req.user;
  if (!actor) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Please check the form' });
    return;
  }
  const input = parsed.data;
  db.prepare(
    'UPDATE users SET name = ?, department = ?, start_date = ?, manager_id = ? WHERE id = ?',
  ).run(input.name, input.department, input.startDate, input.managerId, actor.id);
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(actor.id) as UserRow;
  res.json({ user: toPublicUser(row) });
});
