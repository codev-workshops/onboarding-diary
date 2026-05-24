import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('Password1!', 12);

  // ------------------------------------------------------------------
  // Users
  // ------------------------------------------------------------------

  const admin = await prisma.user.upsert({
    where: { email: 'admin@onboarding-diary.local' },
    update: {},
    create: {
      email: 'admin@onboarding-diary.local',
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      role: 'SYS_ADMIN',
    },
  });
  console.log(`Created admin: ${admin.email}`);

  const hr = await prisma.user.upsert({
    where: { email: 'hr@onboarding-diary.local' },
    update: {},
    create: {
      email: 'hr@onboarding-diary.local',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'HR',
      role: 'HR_ADMIN',
    },
  });
  console.log(`Created HR admin: ${hr.email}`);

  const manager = await prisma.user.upsert({
    where: { email: 'manager@onboarding-diary.local' },
    update: {},
    create: {
      email: 'manager@onboarding-diary.local',
      passwordHash,
      firstName: 'John',
      lastName: 'Manager',
      role: 'MANAGER',
    },
  });
  console.log(`Created manager: ${manager.email}`);

  const recruit = await prisma.user.upsert({
    where: { email: 'recruit@onboarding-diary.local' },
    update: {},
    create: {
      email: 'recruit@onboarding-diary.local',
      passwordHash,
      firstName: 'Jane',
      lastName: 'Recruit',
      role: 'RECRUIT',
    },
  });
  console.log(`Created recruit: ${recruit.email}`);

  // ------------------------------------------------------------------
  // Recruit Profile
  // ------------------------------------------------------------------

  await prisma.recruitProfile.upsert({
    where: { userId: recruit.id },
    update: {},
    create: {
      userId: recruit.id,
      department: 'Engineering',
      position: 'Junior Software Engineer',
      startDate: new Date(),
      expectedEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      bio: 'New engineering recruit, excited to start!',
      onboardingStatus: 'IN_PROGRESS',
    },
  });
  console.log('Created recruit profile');

  // ------------------------------------------------------------------
  // Manager ↔ Recruit Relationship
  // ------------------------------------------------------------------

  await prisma.managerRecruitRelationship.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      managerId: manager.id,
      recruitId: recruit.id,
      notes: 'Primary manager assignment for onboarding',
    },
  });
  console.log('Assigned manager to recruit');

  // ------------------------------------------------------------------
  // Task Entries (sample onboarding tasks)
  // ------------------------------------------------------------------

  await prisma.taskEntry.createMany({
    data: [
      {
        userId: recruit.id,
        title: 'Complete HR paperwork',
        description: 'Submit all required HR documents including tax forms and emergency contacts.',
        priority: 'HIGH',
        status: 'COMPLETED',
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        completedAt: new Date(),
        visibility: 'MANAGER_ONLY',
        tags: ['hr', 'administrative'],
      },
      {
        userId: recruit.id,
        title: 'Set up development environment',
        description: 'Install required tools (Node.js, Docker, VS Code) and run the project locally.',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        visibility: 'MANAGER_ONLY',
        tags: ['technical', 'setup'],
      },
      {
        userId: recruit.id,
        title: 'Complete security training',
        description: 'Finish the mandatory security awareness training module.',
        priority: 'MEDIUM',
        status: 'PENDING',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        visibility: 'MANAGER_ONLY',
        tags: ['training', 'security'],
      },
      {
        userId: recruit.id,
        title: 'Meet 5 team members',
        description: 'Schedule and complete 1-on-1 coffee chats with team members.',
        priority: 'LOW',
        status: 'PENDING',
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        visibility: 'PUBLIC',
        tags: ['social', 'team'],
      },
      {
        userId: recruit.id,
        title: 'Submit first pull request',
        description: 'Pick up a starter issue and get your first PR approved and merged.',
        priority: 'MEDIUM',
        status: 'PENDING',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        visibility: 'MANAGER_ONLY',
        tags: ['deliverable', 'code'],
      },
    ],
    skipDuplicates: true,
  });
  console.log('Created sample task entries');

  // ------------------------------------------------------------------
  // Issue Entries
  // ------------------------------------------------------------------

  await prisma.issueEntry.createMany({
    data: [
      {
        userId: recruit.id,
        title: 'VPN not connecting',
        description: 'Unable to connect to the corporate VPN. Getting timeout errors after entering credentials.',
        severity: 'HIGH',
        status: 'OPEN',
        visibility: 'MANAGER_ONLY',
        tags: ['infrastructure', 'vpn'],
      },
      {
        userId: recruit.id,
        title: 'Missing access to staging environment',
        description: 'I need access to the staging Kubernetes cluster to deploy my changes for testing.',
        severity: 'MEDIUM',
        status: 'RESOLVED',
        resolutionNote: 'Access granted by DevOps team after manager approval.',
        resolvedAt: new Date(),
        visibility: 'MANAGER_ONLY',
        tags: ['access', 'infrastructure'],
      },
    ],
    skipDuplicates: true,
  });
  console.log('Created sample issue entries');

  // ------------------------------------------------------------------
  // Note Entries (journal)
  // ------------------------------------------------------------------

  await prisma.noteEntry.createMany({
    data: [
      {
        userId: recruit.id,
        title: 'Day 1: First impressions',
        body: 'Really positive first day. The team was welcoming and the onboarding process seems well-structured. Looking forward to diving into the codebase tomorrow.',
        moodRating: 4,
        entryDate: new Date(),
        visibility: 'PRIVATE',
        tags: ['reflection', 'day-1'],
      },
      {
        userId: recruit.id,
        title: 'Day 3: Getting into the code',
        body: 'Spent the day setting up my development environment and reading through the architecture docs. The codebase is large but well-organized. Had some VPN issues but IT is looking into it.',
        moodRating: 3,
        entryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        visibility: 'MANAGER_ONLY',
        tags: ['reflection', 'technical'],
      },
    ],
    skipDuplicates: true,
  });
  console.log('Created sample note entries');

  // ------------------------------------------------------------------
  // Feedback Entries
  // ------------------------------------------------------------------

  await prisma.feedbackEntry.createMany({
    data: [
      {
        authorId: manager.id,
        subjectId: recruit.id,
        type: 'POSITIVE',
        title: 'Great initiative on first week',
        body: 'Jane has shown excellent initiative in her first week. She proactively set up meetings with team members and started contributing to documentation improvements.',
        rating: 4,
      },
      {
        authorId: recruit.id,
        subjectId: manager.id,
        type: 'POSITIVE',
        title: 'Very supportive onboarding experience',
        body: 'John has been incredibly supportive during my first week. He ensured I had all the access I needed and checked in regularly without being overbearing.',
        rating: 5,
      },
    ],
    skipDuplicates: true,
  });
  console.log('Created sample feedback entries');

  // ------------------------------------------------------------------
  // Report
  // ------------------------------------------------------------------

  await prisma.report.create({
    data: {
      recruitId: recruit.id,
      generatedById: manager.id,
      type: 'WEEKLY',
      status: 'DRAFT',
      title: 'Week 1 Progress Report - Jane Recruit',
      summary: 'First week summary: completed HR paperwork, started dev environment setup, filed one issue (VPN). Positive attitude and good engagement with the team.',
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      generatedData: {
        tasks_total: 5,
        tasks_completed: 1,
        tasks_in_progress: 1,
        issues_open: 1,
        issues_resolved: 1,
        avg_mood: 3.5,
        feedback_count: 2,
      },
    },
  });
  console.log('Created sample report');

  // ------------------------------------------------------------------
  // Done
  // ------------------------------------------------------------------

  console.log('\nSeeding complete!');
  console.log('\nTest credentials (all use password: Password1!):');
  console.log('  Admin:   admin@onboarding-diary.local');
  console.log('  HR:      hr@onboarding-diary.local');
  console.log('  Manager: manager@onboarding-diary.local');
  console.log('  Recruit: recruit@onboarding-diary.local');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
