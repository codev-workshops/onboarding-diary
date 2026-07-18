import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import type { Express } from 'express';
import { applySchema } from '../../src/schema.js';
import { buildClient, type Db } from '../../src/db.js';
import { provisionProduction } from '../../src/provision.js';
import { dockerAvailable } from './dockerAvailable.js';

const hasDocker = dockerAvailable();

const ADMIN_EMAIL = 'real.admin@acme.example';
const ADMIN_PASSWORD = 'Sup3rSecretAdmin!';
const MANAGER_PASSWORD = 'Manager1Password';
const RECRUIT_PASSWORD = 'Recruit1Password';

async function token(app: Express, email: string, password: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  expect(res.status).toBe(200);
  return res.body.token as string;
}

/**
 * End-to-end demo→production cutover against a real PostgreSQL instance
 * (docs/ASSUMPTIONS.md §13). Provisions the DB via the setup tool's core, then
 * boots the real server API in production mode (DB_STRING set) and drives the
 * whole admin→manager→recruit workflow over HTTP to prove production works.
 */
describe.skipIf(!hasDocker)('demo → production transition (Testcontainers)', () => {
  let container: StartedPostgreSqlContainer;
  let app: Express;
  let db: Db;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    const url = container.getConnectionUri();

    // 1) Provision the production DB exactly as the setup tool does.
    applySchema(url);
    db = buildClient(url);
    const result = await provisionProduction(db, {
      adminEmail: ADMIN_EMAIL,
      adminName: 'Real Admin',
      adminPassword: ADMIN_PASSWORD,
    });
    expect(result.adminCreated).toBe(true);
    expect(result.categoriesCreated).toBe(5);

    // 2) Boot the real server API in production mode against the same DB.
    process.env.DB_STRING = url;
    process.env.JWT_SECRET = 'integration-secret-strong-value-123456';
    const { createApp } = await import('../../../server/src/app.js');
    app = createApp();
  });

  afterAll(async () => {
    await db?.$disconnect();
    await container?.stop();
    delete process.env.DB_STRING;
  });

  it('reports production mode and hides demo endpoints', async () => {
    const cfg = await request(app).get('/api/config');
    expect(cfg.body.demoMode).toBe(false);
    expect(cfg.body.datasource).toBe('production');
    expect(cfg.body.onboardingEnablersEnabled).toBe(false);

    const demo = await request(app).get('/api/config/demo');
    expect(demo.status).toBe(404);
  });

  it('has no demo accounts and no public demo password', async () => {
    const demoUser = await db.user.findFirst({ where: { email: { endsWith: '@demo.local' } } });
    expect(demoUser).toBeNull();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@demo.local', password: 'Passw0rd!' });
    expect(login.status).toBe(401);
  });

  it('runs the full admin → manager → recruit workflow on PostgreSQL', async () => {
    const adminToken = await token(app, ADMIN_EMAIL, ADMIN_PASSWORD);
    const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

    // Admin provisions a department.
    const dept = await request(app)
      .post('/api/departments')
      .set(auth(adminToken))
      .send({ name: 'Engineering' });
    expect(dept.status).toBe(201);

    // Admin provisions a manager and a recruit assigned to that manager.
    const manager = await request(app)
      .post('/api/users')
      .set(auth(adminToken))
      .send({
        email: 'manager@acme.example',
        password: MANAGER_PASSWORD,
        name: 'Meg Manager',
        role: 'Manager',
        startDate: '2024-01-01',
        departmentId: dept.body.id,
      });
    expect(manager.status).toBe(201);

    const recruit = await request(app)
      .post('/api/users')
      .set(auth(adminToken))
      .send({
        email: 'recruit@acme.example',
        password: RECRUIT_PASSWORD,
        name: 'Ravi Recruit',
        role: 'Recruit',
        startDate: '2024-02-01',
        departmentId: dept.body.id,
        managerId: manager.body.id,
      });
    expect(recruit.status).toBe(201);

    // A second manager, then reassign the recruit to prove manager reassignment.
    const manager2 = await request(app)
      .post('/api/users')
      .set(auth(adminToken))
      .send({
        email: 'manager2@acme.example',
        password: MANAGER_PASSWORD,
        name: 'Sam Manager',
        role: 'Manager',
        startDate: '2024-01-01',
        departmentId: dept.body.id,
      });
    expect(manager2.status).toBe(201);

    const reassign = await request(app)
      .put(`/api/users/${recruit.body.id}`)
      .set(auth(adminToken))
      .send({ managerId: manager2.body.id });
    expect(reassign.status).toBe(200);
    expect(reassign.body.managerId).toBe(manager2.body.id);

    // The new manager sees the recruit on their team; the recruit can log in.
    const manager2Token = await token(app, 'manager2@acme.example', MANAGER_PASSWORD);
    const team = await request(app).get('/api/dashboard/team').set(auth(manager2Token));
    expect(team.status).toBe(200);
    const ids = JSON.stringify(team.body);
    expect(ids).toContain(recruit.body.id);

    const recruitToken = await token(app, 'recruit@acme.example', RECRUIT_PASSWORD);
    const dash = await request(app).get('/api/dashboard').set(auth(recruitToken));
    expect(dash.status).toBe(200);

    // Reference data is present, and the recruit can create a task on Postgres.
    const categories = await request(app).get('/api/categories').set(auth(recruitToken));
    expect(categories.status).toBe(200);
    expect(categories.body.length).toBeGreaterThanOrEqual(5);

    const task = await request(app)
      .post('/api/tasks')
      .set(auth(recruitToken))
      .send({
        date: '2024-02-05',
        title: 'Read the handbook',
        categoryId: categories.body[0].id,
        status: 'To Do',
        priority: 'High',
      });
    expect([200, 201]).toContain(task.status);
  });
});
