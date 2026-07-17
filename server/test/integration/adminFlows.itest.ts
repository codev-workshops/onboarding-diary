import { execSync } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { dockerAvailable } from './dockerAvailable.js';
// The Postgres client is generated to src/generated/pg by `prisma generate`.
import { PrismaClient } from '../../src/generated/pg/index.js';
import type { Db } from '../../src/db/prisma.js';
import {
  createDepartment,
  deleteDepartment,
  listDepartments,
} from '../../src/modules/departments/departments.service.js';
import {
  createUser,
  listUsers,
  updateUser,
} from '../../src/modules/users/users.service.js';

const hasDocker = dockerAvailable();

/**
 * Exercises the Admin management use-cases (departments, users/managers, and
 * re-assigning a recruit's manager) through the real service layer against a
 * live PostgreSQL instance. This validates the production datasource path — the
 * services run identical Prisma queries on Postgres as they do on SQLite.
 */
describe.skipIf(!hasDocker)('Admin management flows on PostgreSQL (Testcontainers)', () => {
  let container: StartedPostgreSqlContainer;
  let pg: PrismaClient;
  // The pg-generated client is structurally identical to the default (SQLite)
  // client the services are typed against; bridge the two nominal types once.
  let db: Db;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    const url = container.getConnectionUri();

    execSync('npx prisma db push --schema prisma/schema.postgres.prisma --skip-generate', {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL_POSTGRES: url },
      stdio: 'ignore',
    });

    pg = new PrismaClient({ datasources: { db: { url } } });
    db = pg as unknown as Db;
  });

  afterAll(async () => {
    await pg?.$disconnect();
    await container?.stop();
  });

  it('lets an admin create departments', async () => {
    const eng = await createDepartment(db, { name: 'Engineering' });
    const design = await createDepartment(db, { name: 'Design' });

    const departments = await listDepartments(db);
    expect(departments.map((d) => d.name)).toEqual(expect.arrayContaining(['Engineering', 'Design']));
    expect(eng.id).not.toBe(design.id);
  });

  it('rejects a duplicate department name', async () => {
    await expect(createDepartment(db, { name: 'Engineering' })).rejects.toThrow(/already exists/i);
  });

  it('lets an admin provision managers and recruits, then re-assign a recruit to a new manager', async () => {
    const eng = await createDepartment(db, { name: 'Platform' });

    const managerA = await createUser(db, {
      email: 'manager.a@pg.local',
      password: 'Passw0rd!',
      name: 'Manager A',
      role: 'Manager',
      startDate: new Date(),
      departmentId: eng.id,
    });
    const managerB = await createUser(db, {
      email: 'manager.b@pg.local',
      password: 'Passw0rd!',
      name: 'Manager B',
      role: 'Manager',
      startDate: new Date(),
      departmentId: eng.id,
    });

    const recruit = await createUser(db, {
      email: 'recruit.a@pg.local',
      password: 'Passw0rd!',
      name: 'Recruit A',
      role: 'Recruit',
      startDate: new Date(),
      departmentId: eng.id,
      managerId: managerA.id,
    });
    expect(recruit.managerId).toBe(managerA.id);

    // Re-assign the recruit from Manager A to Manager B.
    const reassigned = await updateUser(db, recruit.id, { managerId: managerB.id });
    expect(reassigned.managerId).toBe(managerB.id);

    const persisted = await pg.user.findUnique({ where: { id: recruit.id } });
    expect(persisted?.managerId).toBe(managerB.id);

    // Public listing never leaks the password hash.
    const users = await listUsers(db);
    const listedRecruit = users.find((u) => u.id === recruit.id);
    expect(listedRecruit).toBeDefined();
    expect(listedRecruit as Record<string, unknown>).not.toHaveProperty('passwordHash');
  });

  it('enforces manager and password validation rules on Postgres', async () => {
    const dept = await createDepartment(db, { name: 'QA' });
    await createUser(db, {
      email: 'plain.recruit@pg.local',
      password: 'Passw0rd!',
      name: 'Plain Recruit',
      role: 'Recruit',
      startDate: new Date(),
      departmentId: dept.id,
    });

    const manager = await createUser(db, {
      email: 'qa.manager@pg.local',
      password: 'Passw0rd!',
      name: 'QA Manager',
      role: 'Manager',
      startDate: new Date(),
      departmentId: dept.id,
    });

    // A user cannot be assigned as their own manager.
    await expect(
      updateUser(db, manager.id, { managerId: manager.id }),
    ).rejects.toThrow(/own manager/i);

    // A recruit is not a valid manager for another user.
    const recruitForManager = await createUser(db, {
      email: 'not.a.manager@pg.local',
      password: 'Passw0rd!',
      name: 'Not A Manager',
      role: 'Recruit',
      startDate: new Date(),
      departmentId: dept.id,
    });
    await expect(
      createUser(db, {
        email: 'bad.manager.ref@pg.local',
        password: 'Passw0rd!',
        name: 'Bad Manager Ref',
        role: 'Recruit',
        startDate: new Date(),
        departmentId: dept.id,
        managerId: recruitForManager.id,
      }),
    ).rejects.toThrow(/Manager or Admin role/i);

    await expect(
      createUser(db, {
        email: 'bad.pass@pg.local',
        password: 'short',
        name: 'Bad Pass',
        role: 'Recruit',
        startDate: new Date(),
        departmentId: dept.id,
      }),
    ).rejects.toThrow();

    // A department with members cannot be deleted.
    await expect(deleteDepartment(db, dept.id)).rejects.toThrow(/still has members/i);
  });
});
