import bcrypt from 'bcryptjs';
import { db, migrate } from './db.js';
import type { UserRow } from './lib/types.js';

migrate();

const upsertUser = (input: {
  email: string;
  name: string;
  role: 'recruit' | 'manager' | 'admin';
  department: string;
  startDate: string;
  managerId: number | null;
}): number => {
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(input.email) as
    | UserRow
    | undefined;
  if (existing) {
    return existing.id;
  }
  const info = db
    .prepare(
      `INSERT INTO users (email, password_hash, name, role, department, start_date, manager_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.email,
      bcrypt.hashSync('password123', 10),
      input.name,
      input.role,
      input.department,
      input.startDate,
      input.managerId,
    );
  return Number(info.lastInsertRowid);
};

const daysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

const managerId = upsertUser({
  email: 'manager@example.com',
  name: 'Priya Fernando',
  role: 'manager',
  department: 'Engineering',
  startDate: '2023-02-01',
  managerId: null,
});

const adminId = upsertUser({
  email: 'admin@example.com',
  name: 'Sam Admin',
  role: 'admin',
  department: 'People Ops',
  startDate: '2021-06-14',
  managerId: null,
});

const recruitId = upsertUser({
  email: 'recruit@example.com',
  name: 'Nimal Perera',
  role: 'recruit',
  department: 'Engineering',
  startDate: daysAgo(20),
  managerId,
});

const secondRecruitId = upsertUser({
  email: 'recruit2@example.com',
  name: 'Ayesha Silva',
  role: 'recruit',
  department: 'Design',
  startDate: daysAgo(9),
  managerId,
});

const hasTasks = db.prepare('SELECT COUNT(*) AS count FROM tasks').get() as { count: number };
if (hasTasks.count === 0) {
  const insertTask = db.prepare(
    `INSERT INTO tasks (user_id, date, title, description, category, status, priority)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const tasks: Array<[number, number, string, string, string, string, string]> = [
    [
      recruitId,
      18,
      'Set up laptop and access',
      'Installed tooling, joined Slack and Jira.',
      'Setup',
      'Completed',
      'High',
    ],
    [
      recruitId,
      17,
      'Read engineering handbook',
      'Covered branching model and review policy.',
      'Documentation',
      'Completed',
      'Medium',
    ],
    [
      recruitId,
      14,
      'Pair on billing service',
      'Shadowed Dilan through a bug fix.',
      'Shadowing',
      'Completed',
      'Medium',
    ],
    [
      recruitId,
      9,
      'Ship first bug fix',
      'Fix pagination on the invoices screen.',
      'Development',
      'In progress',
      'High',
    ],
    [
      recruitId,
      5,
      'Security training module',
      'Awaiting licence from People Ops.',
      'Training',
      'Blocked',
      'Low',
    ],
    [
      recruitId,
      2,
      'Team retro attendance',
      'Joined the sprint retro and took notes.',
      'Meeting',
      'Completed',
      'Low',
    ],
    [
      secondRecruitId,
      7,
      'Design system walkthrough',
      'Reviewed tokens and component specs.',
      'Training',
      'Completed',
      'High',
    ],
    [
      secondRecruitId,
      3,
      'Audit onboarding screens',
      'Checking contrast and focus states.',
      'Documentation',
      'In progress',
      'Medium',
    ],
  ];
  for (const [userId, offset, title, description, category, status, priority] of tasks) {
    insertTask.run(userId, daysAgo(offset), title, description, category, status, priority);
  }

  const insertIssue = db.prepare(
    `INSERT INTO issues (user_id, date, title, description, severity, status, resolutionNotes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const issues: Array<[number, number, string, string, string, string, string]> = [
    [
      recruitId,
      16,
      'VPN certificate rejected',
      'Cannot reach staging from home network.',
      'High',
      'Resolved',
      'IT reissued the certificate.',
    ],
    [
      recruitId,
      8,
      'Local test suite flaky',
      'Two integration tests fail intermittently.',
      'Medium',
      'In progress',
      'Investigating with the platform team.',
    ],
    [
      recruitId,
      4,
      'No access to analytics dashboard',
      'Blocked on requesting a licence.',
      'Low',
      'Open',
      '',
    ],
    [
      secondRecruitId,
      5,
      'Figma library out of date',
      'Components differ from the style guide.',
      'Critical',
      'Open',
      '',
    ],
  ];
  for (const [userId, offset, title, description, severity, status, notes] of issues) {
    insertIssue.run(userId, daysAgo(offset), title, description, severity, status, notes);
  }

  const insertFeedback = db.prepare(
    `INSERT INTO feedback (user_id, date, subject, type, details) VALUES (?, ?, ?, ?, ?)`,
  );
  const feedback: Array<[number, number, string, string, string]> = [
    [
      recruitId,
      15,
      'Buddy programme is excellent',
      'Positive',
      'Daily check-ins made week one easy.',
    ],
    [
      recruitId,
      6,
      'Access requests should be pre-provisioned',
      'Suggestion',
      'Two days lost waiting for tool access.',
    ],
    [
      recruitId,
      3,
      'Handbook contradicts the deploy runbook',
      'Concern',
      'Unclear which release process is current.',
    ],
    [
      secondRecruitId,
      2,
      'Design onboarding checklist helped',
      'Positive',
      'Clear order of what to read first.',
    ],
  ];
  for (const [userId, offset, subject, type, details] of feedback) {
    insertFeedback.run(userId, daysAgo(offset), subject, type, details);
  }

  const insertNote = db.prepare(
    `INSERT INTO notes (user_id, date, title, content, tags) VALUES (?, ?, ?, ?, ?)`,
  );
  const notes: Array<[number, number, string, string, string]> = [
    [
      recruitId,
      12,
      'Deployment cheat sheet',
      'Staging deploys run from the release branch each Tuesday.',
      'deploys, release',
    ],
    [recruitId, 7, 'People to meet', 'Dilan (platform), Ruwan (QA), Priya (manager).', 'people'],
    [
      secondRecruitId,
      4,
      'Token naming conventions',
      'Colors use shape/text prefixes; never hardcode hex values.',
      'design, tokens',
    ],
  ];
  for (const [userId, offset, title, content, tags] of notes) {
    insertNote.run(userId, daysAgo(offset), title, content, tags);
  }
}

console.log('Seeded demo data.');
console.log(
  `Users: recruit@example.com, recruit2@example.com, manager@example.com, admin@example.com`,
);
console.log(
  `Password for all demo accounts: password123 (ids ${recruitId}, ${secondRecruitId}, ${managerId}, ${adminId})`,
);
