/**
 * Request validation. `defineRoute` parses `params`, `query`, and `body` with the shared
 * Zod schemas, strips unknown fields, and hands the handler fully typed input; failures
 * become a 422 carrying per-field details (TRD 6.1).
 */

import type { FieldError } from '@onboarding-diary/shared';
import type { Request, RequestHandler, Response } from 'express';
import type { z, ZodType } from 'zod';

import { ValidationError } from '../lib/errors.js';

export type RouteSchemas = {
  params?: ZodType;
  query?: ZodType;
  body?: ZodType;
};

type Output<S extends ZodType | undefined> = S extends ZodType ? z.output<S> : undefined;

export type RouteContext<S extends RouteSchemas> = {
  params: Output<S['params']>;
  query: Output<S['query']>;
  body: Output<S['body']>;
  req: Request;
  res: Response;
};

function toFieldErrors(prefix: string, error: z.ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    field: [prefix, ...issue.path.map(String)].filter((part) => part.length > 0).join('.'),
    message: issue.message,
  }));
}

/** Validate the documented request parts, collecting every failure before responding. */
export function validate(schemas: RouteSchemas): RequestHandler {
  return (req, _res, next) => {
    const details: FieldError[] = [];
    for (const [part, schema] of Object.entries(schemas) as [
      keyof RouteSchemas,
      ZodType | undefined,
    ][]) {
      if (schema === undefined) continue;
      const source = part === 'body' ? req.body : part === 'query' ? req.query : req.params;
      const result = schema.safeParse(source ?? {});
      if (!result.success)
        details.push(...toFieldErrors(part === 'body' ? '' : part, result.error));
    }
    next(
      details.length > 0 ? new ValidationError('Request validation failed', details) : undefined,
    );
  };
}

/** Build a handler whose validated input is typed by the supplied schemas. */
export function defineRoute<const S extends RouteSchemas>(
  schemas: S,
  handler: (ctx: RouteContext<S>) => Promise<void> | void,
): RequestHandler {
  return async (req, res, next) => {
    const details: FieldError[] = [];
    const parsed: Record<string, unknown> = {};

    for (const part of ['params', 'query', 'body'] as const) {
      const schema = schemas[part];
      if (schema === undefined) continue;
      const source = part === 'body' ? req.body : part === 'query' ? req.query : req.params;
      const result = schema.safeParse(source ?? {});
      if (result.success) {
        parsed[part] = result.data;
      } else {
        details.push(...toFieldErrors(part === 'body' ? '' : part, result.error));
      }
    }

    if (details.length > 0) {
      next(new ValidationError('Request validation failed', details));
      return;
    }

    const context = {
      params: parsed['params'],
      query: parsed['query'],
      body: parsed['body'],
      req,
      res,
    } as RouteContext<S>;

    try {
      await handler(context);
    } catch (error) {
      next(error);
    }
  };
}
