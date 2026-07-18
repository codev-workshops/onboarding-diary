import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import type { Role } from '../domain/enums.js';

export interface JwtPayload {
  sub: string;
  role: Role;
  name: string;
  email: string;
}

/** Signs a JWT for an authenticated user (docs/ASSUMPTIONS.md §1). */
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  } as jwt.SignOptions);
}

/** Verifies and decodes a JWT, throwing if invalid/expired. */
export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, config.jwtSecret);
  if (typeof decoded === 'string') {
    throw new Error('Invalid token payload');
  }
  const { sub, role, name, email } = decoded as jwt.JwtPayload & Partial<JwtPayload>;
  if (!sub || !role || !name || !email) {
    throw new Error('Invalid token payload');
  }
  return { sub, role, name, email };
}
