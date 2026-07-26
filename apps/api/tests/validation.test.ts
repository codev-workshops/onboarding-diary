import express, { type Express } from 'express';
import supertest from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createLogger } from '../src/lib/logger.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { requestId } from '../src/middleware/requestContext.js';
import { defineRoute, validate } from '../src/middleware/validate.js';
import { testConfig } from './helpers/app.js';

const logger = createLogger(testConfig());

const body = z.object({ title: z.string().min(1), count: z.number().int().optional() });
const query = z.object({ page: z.coerce.number().int().positive().default(1) });
const params = z.object({ id: z.uuid() });

function harness(): Express {
  const app = express();
  app.use(requestId());
  app.use(express.json());
  app.post(
    '/typed/:id',
    defineRoute(
      { body, query, params },
      ({ body: parsedBody, query: parsedQuery, params: parsedParams, res }) => {
        res.json({ data: { body: parsedBody, query: parsedQuery, params: parsedParams } });
      },
    ),
  );
  app.post('/plain', validate({ body }), (_req, res) => {
    res.json({ data: 'ok' });
  });
  app.use(errorHandler(logger));
  return app;
}

const app = harness();
const ID = '6f1b0f7e-0000-4000-8000-000000000000';

describe('request validation', () => {
  it('passes parsed and coerced values to the handler', async () => {
    const response = await supertest(app)
      .post(`/typed/${ID}?page=3`)
      .send({ title: 'Hello', count: 2 });
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      body: { title: 'Hello', count: 2 },
      query: { page: 3 },
      params: { id: ID },
    });
  });

  it('strips unknown body fields', async () => {
    const response = await supertest(app)
      .post(`/typed/${ID}`)
      .send({ title: 'Hello', role: 'ADMIN', ownerId: 'someone-else' });
    expect(response.body.data.body).toEqual({ title: 'Hello' });
  });

  it('returns 422 with a field-level detail per failure', async () => {
    const response = await supertest(app).post('/typed/not-a-uuid?page=0').send({ title: '' });
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(
      response.body.error.details.map((detail: { field: string }) => detail.field).sort(),
    ).toEqual(['params.id', 'query.page', 'title']);
    expect(response.body.error.requestId).toEqual(expect.any(String));
  });

  it('validates without handing values to the handler when used as plain middleware', async () => {
    expect((await supertest(app).post('/plain').send({ title: 'ok' })).status).toBe(200);
    const invalid = await supertest(app).post('/plain').send({});
    expect(invalid.status).toBe(422);
    expect(invalid.body.error.details[0].field).toBe('title');
  });
});
