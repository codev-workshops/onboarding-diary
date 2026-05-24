import type { Role } from '@onboarding-diary/shared';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: Role;
      };
      requestId: string;
    }
  }
}
