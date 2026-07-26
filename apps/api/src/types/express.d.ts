import type { Role } from '@onboarding-diary/shared';

declare global {
  namespace Express {
    interface Request {
      /** Correlates log lines with error responses (TRD 6.1). */
      requestId: string;
      /** Populated by `requireAuth`. */
      user?: { id: string; role: Role };
    }
  }
}

export {};
