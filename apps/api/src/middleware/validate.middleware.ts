import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';
import { ValidationError } from '../errors/AppError.js';

type ValidationTarget = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, target: ValidationTarget = 'body'): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new ValidationError(details);
    }

    req[target] = result.data;
    next();
  };
}
