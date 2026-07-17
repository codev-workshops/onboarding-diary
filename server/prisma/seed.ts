import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth/password.js';
import {
  DEFAULT_TASK_CATEGORIES,
  FEEDBACK_TYPES,
  ISSUE_SEVERITIES,
  ISSUE_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '../src/domain/enums.js';

const prisma = new PrismaClient();

/** Shared password for all demo accounts (docs/ASSUMPTIONS.md §9 — demo only). */
export const DEMO_PASSWORD = 'Passw0rd!';

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(12, 0, 0, 0);
  return d;
}

/**
 * Seeds the demo dataset: multiple departments, multiple managers and recruits,
 * default task categories, and a realistic spread of entries across all logs
 * (docs/ASSUMPTIONS.md §9).
 */
export async function seedDemoData(client: PrismaClient = prisma): Promise<void> {
  // Clear existing data (order respects FKs).
  await client.task.deleteMany();
  await client.issue.deleteMany();
  await client.feedback.deleteMany();
  await client.note.deleteMany();
  await client.taskCategory.deleteMany();
  await client.user.deleteMany();
  await client.department.deleteMany();

  const engineering = await client.department.create({ data: { name: 'Engineering' } });
  const design = await client.department.create({ data: { name: 'Design' } });
  const marketing = await client.department.create({ data: { name: 'Marketing' } });

  const categories = await Promise.all(
    DEFAULT_TASK_CATEGORIES.map((name) => client.taskCategory.create({ data: { name } })),
  );
  const categoryByName = new Map(categories.map((c) => [c.name, c]));

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const admin = await client.user.create({
    data: {
      email: 'admin@demo.local',
      passwordHash,
      name: 'Ada Admin',
      role: 'Admin',
      startDate: daysAgo(365),
      departmentId: engineering.id,
    },
  });

  const managerEng = await client.user.create({
    data: {
      email: 'manager.eng@demo.local',
      passwordHash,
      name: 'Marcus Manager',
      role: 'Manager',
      startDate: daysAgo(300),
      departmentId: engineering.id,
    },
  });

  const managerDesign = await client.user.create({
    data: {
      email: 'manager.design@demo.local',
      passwordHash,
      name: 'Dana Director',
      role: 'Manager',
      startDate: daysAgo(280),
      departmentId: design.id,
    },
  });

  const recruits = await Promise.all([
    client.user.create({
      data: {
        email: 'recruit.rina@demo.local',
        passwordHash,
        name: 'Rina Recruit',
        role: 'Recruit',
        startDate: daysAgo(20),
        departmentId: engineering.id,
        managerId: managerEng.id,
      },
    }),
    client.user.create({
      data: {
        email: 'recruit.raj@demo.local',
        passwordHash,
        name: 'Raj Rookie',
        role: 'Recruit',
        startDate: daysAgo(14),
        departmentId: engineering.id,
        managerId: managerEng.id,
      },
    }),
    client.user.create({
      data: {
        email: 'recruit.dina@demo.local',
        passwordHash,
        name: 'Dina Newbie',
        role: 'Recruit',
        startDate: daysAgo(10),
        departmentId: design.id,
        managerId: managerDesign.id,
      },
    }),
    client.user.create({
      data: {
        email: 'recruit.mo@demo.local',
        passwordHash,
        name: 'Mo Marketer',
        role: 'Recruit',
        startDate: daysAgo(5),
        departmentId: marketing.id,
        managerId: managerDesign.id,
      },
    }),
  ]);

  // Seed a spread of entries per recruit.
  for (const [index, recruit] of recruits.entries()) {
    const base = index * 3;
    await client.task.createMany({
      data: [
        {
          ownerId: recruit.id,
          date: daysAgo(base + 1),
          title: 'Set up development environment',
          description: 'Install tooling and clone repositories.',
          categoryId: (categoryByName.get('Setup') ?? categories[0]).id,
          status: TASK_STATUSES[2],
          priority: TASK_PRIORITIES[2],
        },
        {
          ownerId: recruit.id,
          date: daysAgo(base + 2),
          title: 'Complete onboarding training',
          description: 'Work through the required training modules.',
          categoryId: (categoryByName.get('Training') ?? categories[0]).id,
          status: TASK_STATUSES[1],
          priority: TASK_PRIORITIES[1],
        },
        {
          ownerId: recruit.id,
          date: daysAgo(base + 3),
          title: 'Read team documentation',
          description: 'Review architecture and process docs.',
          categoryId: (categoryByName.get('Documentation') ?? categories[0]).id,
          status: TASK_STATUSES[0],
          priority: TASK_PRIORITIES[0],
        },
      ],
    });

    await client.issue.createMany({
      data: [
        {
          ownerId: recruit.id,
          date: daysAgo(base + 1),
          title: 'VPN access not working',
          description: 'Cannot connect to the internal VPN.',
          severity: ISSUE_SEVERITIES[2],
          status: ISSUE_STATUSES[0],
        },
        {
          ownerId: recruit.id,
          date: daysAgo(base + 4),
          title: 'Missing repository permissions',
          description: 'Need write access to the main repo.',
          severity: ISSUE_SEVERITIES[1],
          status: ISSUE_STATUSES[2],
          resolutionNotes: 'Access granted by admin.',
        },
      ],
    });

    await client.feedback.create({
      data: {
        ownerId: recruit.id,
        date: daysAgo(base + 2),
        subject: 'Great onboarding buddy',
        type: FEEDBACK_TYPES[0],
        details: 'My buddy was very helpful during the first week.',
      },
    });

    await client.note.create({
      data: {
        ownerId: recruit.id,
        date: daysAgo(base + 1),
        title: 'First week reflections',
        content: 'Learned a lot about the team and the codebase.',
        tags: JSON.stringify(['reflection', 'week-1']),
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seeded ${1 + 2 + recruits.length} users across 3 departments with demo entries. Demo password: ${DEMO_PASSWORD}`,
  );
  void admin;
}

// Execute only when run directly (tsx prisma/seed.ts), not when imported by tests.
const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  seedDemoData()
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      process.exitCode = 1;
    })
    .finally(() => {
      void prisma.$disconnect();
    });
}
