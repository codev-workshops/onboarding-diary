import { z } from 'zod';
import type { Db } from '../../db/prisma.js';
import { ApiError } from '../../http/errors.js';
import { verifyPassword } from '../../auth/password.js';
import { signToken } from '../../auth/jwt.js';
import type { Role } from '../../domain/enums.js';

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
  };
}

/** Authenticates an email/password pair and issues a JWT (docs/ASSUMPTIONS.md §1). */
export async function login(db: Db, input: LoginInput): Promise<LoginResult> {
  const user = await db.user.findUnique({ where: { email: input.email } });
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw ApiError.unauthorized('Invalid email or password');

  const role = user.role as Role;
  const token = signToken({ sub: user.id, role, name: user.name, email: user.email });
  return { token, user: { id: user.id, email: user.email, name: user.name, role } };
}
