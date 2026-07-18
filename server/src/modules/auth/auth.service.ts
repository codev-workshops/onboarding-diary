import { z } from 'zod';
import type { Db } from '../../db/prisma.js';
import { config } from '../../config/env.js';
import { ApiError } from '../../http/errors.js';
import { verifyPassword } from '../../auth/password.js';
import { signToken } from '../../auth/jwt.js';
import type { Role } from '../../domain/enums.js';

/** Demo accounts share a public password; block them outside demo mode. */
const DEMO_EMAIL_SUFFIX = '@demo.local';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;

export interface LoginResult {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: Role;
    timezone: string;
  };
}

/** Authenticates an email/password pair and issues a JWT (docs/ASSUMPTIONS.md §1). */
export async function login(db: Db, input: LoginInput): Promise<LoginResult> {
  // Defense in depth: demo accounts use a well-known public password, so they
  // must never authenticate in production, even if such a row somehow exists
  // (SECURITY_REVIEW.md).
  if (!config.demoMode && input.email.toLowerCase().endsWith(DEMO_EMAIL_SUFFIX)) {
    throw ApiError.unauthorized('Invalid email or password');
  }

  const user = await db.user.findUnique({ where: { email: input.email } });
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Invalid email or password');

  const role = user.role as Role;
  const token = signToken({ sub: user.id, role, name: user.name, email: user.email });
  return {
    token,
    user: { id: user.id, email: user.email, name: user.name, role, timezone: user.timezone },
  };
}
