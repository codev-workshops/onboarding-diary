import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/auth/password.js';
import { DEMO_PASSWORD } from '../src/domain/demo.js';
import {
  DEFAULT_TASK_CATEGORIES,
  FEEDBACK_TYPES,
  ISSUE_SEVERITIES,
  ISSUE_STATUSES,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '../src/domain/enums.js';

const prisma = new PrismaClient();

export { DEMO_PASSWORD };

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(12, 0, 0, 0);
  return d;
}

function daysFromNow(n: number): Date {
  return daysAgo(-n);
}

/**
 * Seeds the demo dataset: multiple departments, multiple managers and recruits,
 * default task categories, and a realistic spread of entries across all logs
 * (docs/ASSUMPTIONS.md §9).
 */
export async function seedDemoData(client: PrismaClient = prisma): Promise<void> {
  // Clear existing data (order respects FKs).
  await client.mention.deleteMany();
  await client.comment.deleteMany();
  await client.checklistItem.deleteMany();
  await client.checklistTemplate.deleteMany();
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
          // Past due and not done -> shows as overdue on dashboards (§18).
          dueDate: daysAgo(2),
        },
        {
          ownerId: recruit.id,
          date: daysAgo(base + 1),
          title: 'Schedule 1:1 with manager',
          description: 'Book an intro meeting with your manager.',
          categoryId: (categoryByName.get('Meeting') ?? categories[0]).id,
          status: TASK_STATUSES[0],
          priority: TASK_PRIORITIES[1],
          // Upcoming due date (not overdue).
          dueDate: daysFromNow(5),
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

  // Checklist template (§17) with due offsets relative to a recruit's start date.
  await client.checklistTemplate.create({
    data: {
      name: 'Engineering onboarding',
      description: 'Standard first-week checklist for engineering recruits.',
      role: 'Recruit',
      departmentId: engineering.id,
      items: {
        create: [
          {
            title: 'Set up development environment',
            description: 'Install tooling and clone repositories.',
            priority: TASK_PRIORITIES[2],
            dueOffsetDays: 1,
            categoryId: (categoryByName.get('Setup') ?? categories[0]).id,
            order: 0,
          },
          {
            title: 'Complete onboarding training',
            description: 'Work through the required training modules.',
            priority: TASK_PRIORITIES[1],
            dueOffsetDays: 3,
            categoryId: (categoryByName.get('Training') ?? categories[0]).id,
            order: 1,
          },
          {
            title: 'Meet your team',
            description: 'Schedule intros with each teammate.',
            priority: TASK_PRIORITIES[0],
            dueOffsetDays: 5,
            categoryId: (categoryByName.get('Meeting') ?? categories[0]).id,
            order: 2,
          },
        ],
      },
    },
  });

  // A comment with an @mention (§19) so the demo activity indicator is populated.
  const rina = recruits[0];
  const rinaTask = await client.task.findFirst({
    where: { ownerId: rina.id, title: 'Read team documentation' },
  });
  if (rinaTask) {
    await client.comment.create({
      data: {
        taskId: rinaTask.id,
        authorId: rina.id,
        body: 'Which architecture doc should I start with, @manager.eng?',
        mentions: { create: [{ userId: managerEng.id }] },
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
