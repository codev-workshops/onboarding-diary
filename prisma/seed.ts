/**
 * Seed data for the Onboarding Diary.
 *
 * The shape of this seed is deliberate: manager scope isolation cannot be
 * demonstrated (or tested) with a single manager, so it creates two managers
 * whose recruits must never be visible to each other, plus one recruit with no
 * manager at all — a user only an admin can see.
 *
 *   admin@onboarding.test        ADMIN
 *   marcus.bell@onboarding.test  MANAGER  -> priya, sam, tom
 *   dana.lee@onboarding.test     MANAGER  -> aisha, ben, chloe
 *   (no manager)                 RECRUIT  -> noah
 *
 * The script is idempotent: users and departments are upserted, and diary
 * entries are only generated when the tables are empty, so `docker compose up`
 * can run it on every start.
 */
import { PrismaClient, type Prisma, type TaskCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? 'Passw0rd!23';
const BCRYPT_COST = 12;

/** Deterministic PRNG so repeated seeds produce identical demo data. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20260822);

function pick<T>(items: readonly T[]): T {
  const item = items[Math.floor(rand() * items.length)];
  if (item === undefined) throw new Error('pick() called with an empty list');
  return item;
}

function randomInt(minInclusive: number, maxInclusive: number): number {
  return minInclusive + Math.floor(rand() * (maxInclusive - minInclusive + 1));
}

/** UTC calendar date, `daysAgo` days before today, with the time component zeroed. */
function daysAgo(days: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days));
}

/** A plausible moment during the working day the entry describes. */
function loggedAt(entryDate: Date): Date {
  return new Date(entryDate.getTime() + randomInt(8, 18) * 3_600_000 + randomInt(0, 59) * 60_000);
}

const DEPARTMENTS = [
  { name: 'Engineering', description: 'Software engineering and platform' },
  { name: 'Product', description: 'Product management and research' },
  { name: 'Design', description: 'Product and brand design' },
  { name: 'People Operations', description: 'HR, onboarding and workplace' },
] as const;

type SeedUser = {
  email: string;
  fullName: string;
  role: 'ADMIN' | 'MANAGER' | 'RECRUIT';
  department: (typeof DEPARTMENTS)[number]['name'];
  startDaysAgo: number;
  managerEmail?: string;
};

const USERS: SeedUser[] = [
  {
    email: 'admin@onboarding.test',
    fullName: 'Ana Rodriguez',
    role: 'ADMIN',
    department: 'People Operations',
    startDaysAgo: 900,
  },
  {
    email: 'marcus.bell@onboarding.test',
    fullName: 'Marcus Bell',
    role: 'MANAGER',
    department: 'Engineering',
    startDaysAgo: 700,
  },
  {
    email: 'dana.lee@onboarding.test',
    fullName: 'Dana Lee',
    role: 'MANAGER',
    department: 'Product',
    startDaysAgo: 640,
  },
  // Marcus Bell's recruits
  {
    email: 'priya.sharma@onboarding.test',
    fullName: 'Priya Sharma',
    role: 'RECRUIT',
    department: 'Engineering',
    startDaysAgo: 58,
    managerEmail: 'marcus.bell@onboarding.test',
  },
  {
    email: 'sam.okafor@onboarding.test',
    fullName: 'Sam Okafor',
    role: 'RECRUIT',
    department: 'Engineering',
    startDaysAgo: 41,
    managerEmail: 'marcus.bell@onboarding.test',
  },
  {
    email: 'tom.nguyen@onboarding.test',
    fullName: 'Tom Nguyen',
    role: 'RECRUIT',
    department: 'Design',
    startDaysAgo: 22,
    managerEmail: 'marcus.bell@onboarding.test',
  },
  // Dana Lee's recruits
  {
    email: 'aisha.khan@onboarding.test',
    fullName: 'Aisha Khan',
    role: 'RECRUIT',
    department: 'Product',
    startDaysAgo: 55,
    managerEmail: 'dana.lee@onboarding.test',
  },
  {
    email: 'ben.carter@onboarding.test',
    fullName: 'Ben Carter',
    role: 'RECRUIT',
    department: 'Product',
    startDaysAgo: 33,
    managerEmail: 'dana.lee@onboarding.test',
  },
  {
    email: 'chloe.martin@onboarding.test',
    fullName: 'Chloe Martin',
    role: 'RECRUIT',
    department: 'Design',
    startDaysAgo: 14,
    managerEmail: 'dana.lee@onboarding.test',
  },
  // Deliberately unassigned: only an admin can see this recruit.
  {
    email: 'noah.silva@onboarding.test',
    fullName: 'Noah Silva',
    role: 'RECRUIT',
    department: 'Engineering',
    startDaysAgo: 9,
  },
];

const TASK_TITLES: Record<TaskCategory, readonly string[]> = {
  ORIENTATION: ['Company all-hands induction', 'Meet the team coffee round', 'Read the employee handbook'],
  TRAINING: [
    'Security awareness training',
    'Internal platform 101 course',
    'Accessibility fundamentals module',
  ],
  SETUP: ['Set up local development environment', 'Configure VPN and MFA', 'Install design toolchain'],
  DOCUMENTATION: ['Write onboarding notes for the next hire', 'Document the deployment runbook gaps'],
  MEETING: ['First 1:1 with manager', 'Sprint planning observation', 'Architecture guild session'],
  PROJECT_WORK: [
    'Fix flaky test in checkout suite',
    'Ship first small bug fix',
    'Add logging to the import job',
  ],
  SHADOWING: ['Shadow on-call engineer', 'Sit in on a customer interview'],
  COMPLIANCE: ['Complete GDPR training', 'Sign code of conduct acknowledgement'],
  OTHER: ['Order equipment', 'Book desk for onsite week'],
};

const ISSUES: readonly { title: string; description: string }[] = [
  {
    title: 'Cannot connect to the VPN',
    description: 'VPN client rejects my certificate; blocked from staging access since this morning.',
  },
  {
    title: 'No access to the staging database',
    description: 'Requested read-only credentials through IT but the ticket has not been actioned yet.',
  },
  {
    title: 'Local build fails on fresh checkout',
    description: 'The setup script assumes a Node version that is no longer documented in the README.',
  },
  {
    title: 'Missing licence for the design tool',
    description:
      'Cannot open shared design files without a paid seat, so I am blocked on the handoff review.',
  },
  {
    title: 'Onboarding buddy unavailable',
    description:
      'My assigned buddy has been on leave all week and I have queued up several blocking questions.',
  },
  {
    title: 'Repository permissions too narrow',
    description:
      'Read access only on the service repository, so I cannot open a pull request for my first fix.',
  },
  {
    title: 'Test environment data is stale',
    description:
      'Seed data in the shared test environment is months old and does not reproduce the reported defect.',
  },
  {
    title: 'Laptop runs out of memory during builds',
    description:
      'Full monorepo build consistently exhausts memory and the machine becomes unusable for an hour.',
  },
];

const FEEDBACK: readonly { subject: string; type: 'POSITIVE' | 'SUGGESTION' | 'CONCERN'; details: string }[] =
  [
    {
      subject: 'Buddy system works really well',
      type: 'POSITIVE',
      details: 'Having a named buddy for the first fortnight removed most of my day-one friction.',
    },
    {
      subject: 'First week felt well structured',
      type: 'POSITIVE',
      details: 'The day-by-day plan for week one meant I always knew what to do next.',
    },
    {
      subject: 'Add a glossary of internal acronyms',
      type: 'SUGGESTION',
      details:
        'Half of the terms in standup were unfamiliar; a short glossary would save a lot of interruptions.',
    },
    {
      subject: 'Earlier access to the codebase',
      type: 'SUGGESTION',
      details:
        'Repository access arrived on day four; day one would let me read code while waiting for other setup.',
    },
    {
      subject: 'Too many tools introduced at once',
      type: 'CONCERN',
      details:
        'Six tools were introduced on the first two days and I have not retained how most of them fit together.',
    },
    {
      subject: 'Unclear who to ask about payroll',
      type: 'CONCERN',
      details: 'It was not obvious which team owns payroll questions and I bounced between three channels.',
    },
  ];

const NOTES: readonly { title: string; content: string; tags: string[] }[] = [
  {
    title: 'Glossary of internal acronyms',
    content: 'PDP = product design partner. RFC = request for comments. OCP = on-call primary.',
    tags: ['glossary', 'reference'],
  },
  {
    title: 'Questions for my next 1:1',
    content:
      'Ask about the roadmap for Q4, expectations for the first 90 days, and how code review is weighted.',
    tags: ['1-1', 'questions'],
  },
  {
    title: 'Deployment steps as I understand them',
    content:
      'Merge to main, CI builds an image, staging deploy is automatic, production needs a manual approval.',
    tags: ['deployment', 'reference'],
  },
  {
    title: 'People I have met',
    content: 'Marcus (manager), Dana (product), Ravi (platform), Elena (design systems).',
    tags: ['people'],
  },
  {
    title: 'Things that confused me on day one',
    content: 'Two different wiki spaces, and the staging URL in the handbook is out of date.',
    tags: ['onboarding', 'friction'],
  },
  {
    title: 'Useful commands',
    content: 'make dev, make seed, make test-watch. The seed command needs the database running first.',
    tags: ['reference', 'commands'],
  },
];

const TASK_CATEGORIES = Object.keys(TASK_TITLES) as TaskCategory[];
const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'DONE', 'DONE', 'CANCELLED'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_COST);

  const departments = new Map<string, string>();
  for (const department of DEPARTMENTS) {
    const row = await prisma.department.upsert({
      where: { name: department.name },
      update: { description: department.description },
      create: { name: department.name, description: department.description },
    });
    departments.set(row.name, row.id);
  }

  // Users are created manager-first so that manager_id can be resolved by email.
  const userIds = new Map<string, string>();
  for (const user of [...USERS].sort((a, b) => (a.managerEmail ? 1 : 0) - (b.managerEmail ? 1 : 0))) {
    const departmentId = departments.get(user.department) ?? null;
    const managerId = user.managerEmail ? (userIds.get(user.managerEmail) ?? null) : null;
    const row = await prisma.user.upsert({
      where: { email: user.email },
      update: { fullName: user.fullName, role: user.role, departmentId, managerId, isActive: true },
      create: {
        email: user.email,
        passwordHash,
        fullName: user.fullName,
        role: user.role,
        departmentId,
        managerId,
        startDate: daysAgo(user.startDaysAgo),
      },
    });
    userIds.set(row.email, row.id);
  }

  const existingTasks = await prisma.taskEntry.count();
  if (existingTasks > 0) {
    console.log('Diary entries already present — skipping entry generation.');
    await report();
    return;
  }

  const recruits = USERS.filter((user) => user.role === 'RECRUIT');
  const tasks: Prisma.TaskEntryCreateManyInput[] = [];
  const issues: Prisma.IssueEntryCreateManyInput[] = [];
  const feedback: Prisma.FeedbackEntryCreateManyInput[] = [];
  const notes: Prisma.NoteEntryCreateManyInput[] = [];

  for (const recruit of recruits) {
    const ownerId = userIds.get(recruit.email);
    if (!ownerId) throw new Error(`Missing seeded user ${recruit.email}`);
    // Entries never predate the recruit's start date and never sit in the future.
    const span = Math.min(recruit.startDaysAgo, 60);

    const taskCount = randomInt(8, 14);
    for (let i = 0; i < taskCount; i += 1) {
      const category = pick(TASK_CATEGORIES);
      const status = pick(TASK_STATUSES);
      const entryDate = daysAgo(randomInt(0, span));
      tasks.push({
        ownerId,
        createdAt: loggedAt(entryDate),
        updatedById: ownerId,
        entryDate,
        title: pick(TASK_TITLES[category] ?? ['Onboarding task']),
        description:
          'Logged during onboarding week ' + String(Math.ceil((span - randomInt(0, span)) / 7) + 1) + '.',
        category,
        status,
        priority: pick(PRIORITIES),
        // C1: completed_at is required only when the task is DONE (one-way rule).
        completedAt: status === 'DONE' ? entryDate : null,
      });
    }

    const issueCount = randomInt(2, 4);
    for (let i = 0; i < issueCount; i += 1) {
      const template = pick(ISSUES);
      const entryDate = daysAgo(randomInt(0, span));
      const status = pick(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'RESOLVED', 'CLOSED'] as const);
      const isClosed = status === 'RESOLVED' || status === 'CLOSED';
      issues.push({
        ownerId,
        createdAt: loggedAt(entryDate),
        // Resolved issues are attributed to the recruit's manager where there is
        // one, which is what makes the "updated by <manager>" path visible in M5.
        updatedById:
          isClosed && recruit.managerEmail ? (userIds.get(recruit.managerEmail) ?? ownerId) : ownerId,
        entryDate,
        title: template.title,
        description: template.description,
        severity: pick(SEVERITIES),
        status,
        resolutionNotes: isClosed
          ? 'Resolved with IT support; access confirmed working and the recruit was unblocked the same day.'
          : null,
        resolvedAt: isClosed ? entryDate : null,
      });
    }

    // Guarantee at least one open CRITICAL issue per manager scope for the demo.
    if (recruit.email === 'priya.sharma@onboarding.test' || recruit.email === 'aisha.khan@onboarding.test') {
      const entryDate = daysAgo(randomInt(1, 4));
      issues.push({
        ownerId,
        createdAt: loggedAt(entryDate),
        updatedById: ownerId,
        entryDate,
        title: 'Blocked from production incident channel',
        description:
          'I am on the on-call shadow rota tomorrow but cannot join the incident channel or the paging tool.',
        severity: 'CRITICAL',
        status: 'OPEN',
        resolutionNotes: null,
        resolvedAt: null,
      });
    }

    const feedbackCount = randomInt(1, 3);
    for (let i = 0; i < feedbackCount; i += 1) {
      const template = pick(FEEDBACK);
      const entryDate = daysAgo(randomInt(0, span));
      feedback.push({
        ownerId,
        createdAt: loggedAt(entryDate),
        updatedById: ownerId,
        entryDate,
        subject: template.subject,
        type: template.type,
        details: template.details,
        visibility: 'MANAGER_VISIBLE',
      });
    }

    const noteCount = randomInt(1, 3);
    for (let i = 0; i < noteCount; i += 1) {
      const template = pick(NOTES);
      const entryDate = daysAgo(randomInt(0, span));
      notes.push({
        ownerId,
        createdAt: loggedAt(entryDate),
        updatedById: ownerId,
        entryDate,
        title: template.title,
        content: template.content,
        tags: template.tags,
      });
    }
  }

  await prisma.taskEntry.createMany({ data: tasks });
  await prisma.issueEntry.createMany({ data: issues });
  await prisma.feedbackEntry.createMany({ data: feedback });
  await prisma.noteEntry.createMany({ data: notes });

  await report();
}

async function report(): Promise<void> {
  const [departments, users, tasks, issues, feedback, notes] = await Promise.all([
    prisma.department.count(),
    prisma.user.count(),
    prisma.taskEntry.count(),
    prisma.issueEntry.count(),
    prisma.feedbackEntry.count(),
    prisma.noteEntry.count(),
  ]);
  const total = tasks + issues + feedback + notes;
  console.log(
    `Seeded: ${departments} departments, ${users} users, ${total} entries ` +
      `(${tasks} tasks, ${issues} issues, ${feedback} feedback, ${notes} notes).`
  );
  console.log(`Demo password for every seeded account: ${DEMO_PASSWORD}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
