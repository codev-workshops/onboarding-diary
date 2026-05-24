import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('Password1!', 12);

  // Create system admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@onboarding-diary.local' },
    update: {},
    create: {
      email: 'admin@onboarding-diary.local',
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      role: 'SYS_ADMIN',
      department: 'IT',
    },
  });
  console.log(`Created admin: ${admin.email}`);

  // Create HR admin
  const hr = await prisma.user.upsert({
    where: { email: 'hr@onboarding-diary.local' },
    update: {},
    create: {
      email: 'hr@onboarding-diary.local',
      passwordHash,
      firstName: 'Sarah',
      lastName: 'HR',
      role: 'HR_ADMIN',
      department: 'Human Resources',
    },
  });
  console.log(`Created HR admin: ${hr.email}`);

  // Create a mentor
  const mentor = await prisma.user.upsert({
    where: { email: 'mentor@onboarding-diary.local' },
    update: {},
    create: {
      email: 'mentor@onboarding-diary.local',
      passwordHash,
      firstName: 'John',
      lastName: 'Mentor',
      role: 'MENTOR',
      department: 'Engineering',
    },
  });
  console.log(`Created mentor: ${mentor.email}`);

  // Create a recruit
  const recruit = await prisma.user.upsert({
    where: { email: 'recruit@onboarding-diary.local' },
    update: {},
    create: {
      email: 'recruit@onboarding-diary.local',
      passwordHash,
      firstName: 'Jane',
      lastName: 'Recruit',
      role: 'RECRUIT',
      department: 'Engineering',
      startDate: new Date(),
    },
  });
  console.log(`Created recruit: ${recruit.email}`);

  // Create sample onboarding program
  const program = await prisma.onboardingProgram.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Engineering 90-Day Onboarding',
      description: 'A comprehensive 90-day onboarding program for new software engineers.',
      durationDays: 90,
      createdById: hr.id,
      milestones: {
        create: [
          {
            name: 'Complete HR Paperwork',
            description: 'Submit all required HR documents.',
            targetDay: 1,
            category: 'ADMINISTRATIVE',
            sortOrder: 1,
          },
          {
            name: 'Set Up Development Environment',
            description: 'Install required tools and run the project locally.',
            targetDay: 3,
            category: 'TECHNICAL',
            sortOrder: 2,
          },
          {
            name: 'Meet 5 Team Members',
            description: 'Schedule and complete 1-on-1 coffee chats.',
            targetDay: 14,
            category: 'SOCIAL',
            sortOrder: 3,
          },
          {
            name: 'Complete Security Training',
            description: 'Finish the mandatory security awareness module.',
            targetDay: 7,
            category: 'LEARNING',
            sortOrder: 4,
          },
          {
            name: 'First Pull Request Merged',
            description: 'Submit and get your first PR approved and merged.',
            targetDay: 30,
            category: 'DELIVERABLE',
            sortOrder: 5,
          },
        ],
      },
    },
  });
  console.log(`Created program: ${program.name}`);

  // Assign mentor to recruit
  await prisma.mentorAssignment.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      mentorId: mentor.id,
      menteeId: recruit.id,
    },
  });
  console.log('Assigned mentor to recruit');

  // Enroll recruit in program
  await prisma.programEnrollment.upsert({
    where: {
      userId_programId: {
        userId: recruit.id,
        programId: program.id,
      },
    },
    update: {},
    create: {
      userId: recruit.id,
      programId: program.id,
    },
  });
  console.log('Enrolled recruit in program');

  console.log('Seeding complete!');
  console.log('\nTest credentials (all use password: Password1!):');
  console.log('  Admin:   admin@onboarding-diary.local');
  console.log('  HR:      hr@onboarding-diary.local');
  console.log('  Mentor:  mentor@onboarding-diary.local');
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
