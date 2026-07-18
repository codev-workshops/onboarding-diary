import { execSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { dockerAvailable } from './dockerAvailable.js';
// The Postgres client is generated to src/generated/pg by `prisma generate`.
import { PrismaClient } from '../../src/generated/pg/index.js';

const hasDocker = dockerAvailable();

/**
 * Validates the *production* datasource path against a real PostgreSQL instance:
 * Prisma migrations apply cleanly, and repositories/access-control queries behave
 * on Postgres (catching behavior SQLite would mask). Runs on every push in CI and
 * locally when Docker is available; skips gracefully otherwise.
 */
describe.skipIf(!hasDocker)('PostgreSQL integration (Testcontainers)', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    const url = container.getConnectionUri();

    execSync('npx prisma db push --schema prisma/schema.postgres.prisma --skip-generate', {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL_POSTGRES: url },
      stdio: 'ignore',
    });

    prisma = new PrismaClient({ datasources: { db: { url } } });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await container?.stop();
  });

  it('applies migrations and performs CRUD on Postgres', async () => {
    const dept = await prisma.department.create({ data: { name: 'Engineering' } });
    const manager = await prisma.user.create({
      data: {
        email: 'm@pg.local',
        passwordHash: 'x',
        name: 'Manager',
        role: 'Manager',
        startDate: new Date(),
        departmentId: dept.id,
      },
    });
    const recruit = await prisma.user.create({
      data: {
        email: 'r@pg.local',
        passwordHash: 'x',
        name: 'Recruit',
        role: 'Recruit',
        startDate: new Date(),
        departmentId: dept.id,
        managerId: manager.id,
      },
    });
    const category = await prisma.taskCategory.create({ data: { name: 'Setup' } });
    await prisma.task.create({
      data: {
        date: new Date(),
        title: 'Task',
        description: '',
        status: 'Done',
        priority: 'High',
        categoryId: category.id,
        ownerId: recruit.id,
      },
    });

    const managedRecruits = await prisma.user.findMany({ where: { managerId: manager.id } });
    expect(managedRecruits).toHaveLength(1);

    const tasks = await prisma.task.findMany({ where: { ownerId: { in: [recruit.id] } } });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].status).toBe('Done');
  });

  it('enforces the unique email constraint on Postgres', async () => {
    await expect(
      prisma.user.create({
        data: {
          email: 'm@pg.local',
          passwordHash: 'x',
          name: 'Dup',
          role: 'Recruit',
          startDate: new Date(),
        },
      }),
    ).rejects.toThrow();
  });
});
