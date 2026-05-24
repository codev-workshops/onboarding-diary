import jwt, { type SignOptions } from 'jsonwebtoken';
import { config } from '../config/index.js';
import type { JwtPayload } from '@onboarding-diary/shared';

export function signAccessToken(payload: { sub: string; role: string }): string {
  const options: SignOptions = {
    expiresIn: config.JWT_ACCESS_EXPIRY as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, config.JWT_ACCESS_SECRET, options);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, config.JWT_ACCESS_SECRET) as JwtPayload;
}
