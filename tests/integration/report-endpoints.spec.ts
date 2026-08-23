/**
 * The report endpoint against seeded Postgres, through the real handler.
 *
 * A report is the most dangerous read in the product: it is the one place where
 * a caller names other people and asks for their diary in bulk, in a file that
 * then leaves the system. So these tests are mostly about what is *not* in the
 * output — another manager's recruit, an admin-only feedback entry, somebody
 * else's private note — and about the request being refused outright rather
 * than quietly trimmed to what the caller was allowed to see.
 *
 * Requires a seeded database (`npm run db:reset`); rows written here are removed
 * in `afterAll`.
 */
import type { UserRole } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { POST as reportRoute } from '@/app/api/v1/reports/route';
import { SESSION_COOKIE, signSession } from '@/src/modules/auth/session';
import type { ReportModel } from '@/src/modules/reports/model';
import { prisma } from '@/src/shared/db/prisma';
import { pdfPageTexts } from '@/tests/support/pdf-text';

const EMAILS = {
  admin: 'admin@onboarding.test',
  managerA: 'marcus.bell@onboarding.test',
  managerB: 'dana.lee@onboarding.test',
  recruitA: 'priya.sharma@onboarding.test',
  recruitA2: 'sam.okafor@onboarding.test',
  recruitB: 'aisha.khan@onboarding.test',
  unassigned: 'noah.silva@onboarding.test',
} as const;

type Key = keyof typeof EMAILS;

const users = {} as Record<Key, { id: string; role: UserRole; cookie: string }>;
const created = { tasks: [] as string[], feedback: [] as string[], notes: [] as string[] };

const RANGE = { date_from: '2025-09-01', date_to: '2026-08-31' };
const WIDE = { date_from: '2025-10-01', date_to: '2026-08-31' };

const entryDate = new Date('2026-01-15T00:00:00.000Z');

type Body = Record<string, unknown>;
type Json = { data?: ReportModel; error?: { code: string; message: string; details: unknown[] } };

async function post(body: Body, as?: Key): Promise<{ status: number; response: Response }> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (as) headers.cookie = users[as].cookie;

  const response = await reportRoute(
    new Request('http://localhost/api/v1/reports', { method: 'POST', headers, body: JSON.stringify(body) })
  );

  return { status: response.status, response };
}

async function json(body: Body, as?: Key): Promise<{ status: number; json: Json }> {
  const { status, response } = await post(body, as);
  return { status, json: (await response.json()) as Json };
}

const report = (result: { json: Json }): ReportModel => {
  if (!result.json.data) throw new Error(`Expected a report, got ${JSON.stringify(result.json.error)}`);
  return result.json.data;
};

const rowsOf = (model: ReportModel, key: string) =>
  model.sections.find((section) => section.key === key)?.rows ?? [];

const ownersIn = (model: ReportModel, key: string) =>
  new Set(rowsOf(model, key).map((row) => String(row.user_id)));

/** The audit and report-run writes are deliberately off the response path. */
async function eventually<T>(read: () => Promise<T | null>, attempts = 40): Promise<T> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const found = await read();
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error('Expected a row to be written but none appeared.');
}

beforeAll(async () => {
  const rows = await prisma.user.findMany({
    where: { email: { in: Object.values(EMAILS) } },
    select: { id: true, email: true, role: true },
  });

  for (const [key, email] of Object.entries(EMAILS) as [Key, string][]) {
    const row = rows.find((candidate) => candidate.email === email);
    if (!row) throw new Error(`Seed fixture missing: ${email}. Run npm run db:reset.`);
    users[key] = { id: row.id, role: row.role, cookie: `${SESSION_COOKIE}=${await signSession(row.id)}` };
  }

  // A task whose title is a spreadsheet formula, an admin-only feedback entry
  // and a private note — one fixture for each thing a report must handle
  // carefully.
  const task = await prisma.taskEntry.create({
    data: {
      ownerId: users.recruitA.id,
      updatedById: users.recruitA.id,
      entryDate,
      title: '=HYPERLINK("http://evil.example","payslip")',
      description: 'A title, a "quote" and a\nnewline.',
      category: 'SETUP',
      status: 'DONE',
      completedAt: entryDate,
      priority: 'HIGH',
    },
    select: { id: true },
  });
  created.tasks.push(task.id);

  const feedback = await prisma.feedbackEntry.create({
    data: {
      ownerId: users.recruitA.id,
      updatedById: users.recruitA.id,
      entryDate,
      subject: 'Escalation about my manager',
      type: 'CONCERN',
      details: 'Not for the manager to read.',
      visibility: 'ADMIN_ONLY',
    },
    select: { id: true },
  });
  created.feedback.push(feedback.id);

  const note = await prisma.noteEntry.create({
    data: {
      ownerId: users.recruitA.id,
      updatedById: users.recruitA.id,
      entryDate,
      title: 'Private reflection',
      content: 'Nobody else reads this.',
      tags: ['private'],
    },
    select: { id: true },
  });
  created.notes.push(note.id);
});

afterAll(async () => {
  await prisma.reportRun.deleteMany({
    where: { requestedById: { in: Object.values(users).map((u) => u.id) } },
  });
  await prisma.taskEntry.deleteMany({ where: { id: { in: created.tasks } } });
  await prisma.feedbackEntry.deleteMany({ where: { id: { in: created.feedback } } });
  await prisma.noteEntry.deleteMany({ where: { id: { in: created.notes } } });
  await prisma.$disconnect();
});

describe('authentication and transport', () => {
  it('refuses an anonymous caller', async () => {
    const result = await json({ ...RANGE, scope_type: 'SELF', sections: ['TASKS'] });
    expect(result.status).toBe(401);
    expect(result.json.error?.code).toBe('UNAUTHENTICATED');
  });

  it('answers 403 ACCOUNT_DEACTIVATED for a valid cookie on a disabled account', async () => {
    await prisma.user.update({ where: { id: users.unassigned.id }, data: { isActive: false } });
    try {
      const result = await json({ ...RANGE, scope_type: 'SELF', sections: ['TASKS'] }, 'unassigned');
      expect(result.status).toBe(403);
      expect(result.json.error?.code).toBe('ACCOUNT_DEACTIVATED');
    } finally {
      await prisma.user.update({ where: { id: users.unassigned.id }, data: { isActive: true } });
    }
  });

  it('refuses a cross-site form post', async () => {
    const response = await reportRoute(
      new Request('http://localhost/api/v1/reports', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: users.admin.cookie },
        body: 'scope_type=ORG',
      })
    );
    expect(response.status).toBe(415);
  });
});

describe('AZ-R6 — a recruit reports on themselves only', () => {
  it('returns their own entries', async () => {
    const model = report(
      await json({ ...RANGE, scope_type: 'SELF', sections: ['TASKS', 'NOTES'] }, 'recruitA')
    );

    expect(ownersIn(model, 'tasks')).toEqual(new Set([users.recruitA.id]));
    expect(rowsOf(model, 'notes').length).toBeGreaterThan(0);
  });

  it('refuses every other scope', async () => {
    for (const scope of [
      { scope_type: 'USER', user_ids: [users.recruitA2.id] },
      { scope_type: 'USERS', user_ids: [users.recruitA2.id] },
      { scope_type: 'ORG' },
    ]) {
      const result = await json({ ...RANGE, sections: ['TASKS'], ...scope }, 'recruitA');
      expect(result.status).toBe(403);
      expect(result.json.error?.code).toBe('INSUFFICIENT_ROLE');
    }
  });
});

describe('AZ-M6 / AZ-M7 — a manager cannot widen their scope', () => {
  it('defaults to their direct reports and nobody else', async () => {
    const model = report(await json({ ...RANGE, scope_type: 'USERS', sections: ['TASKS'] }, 'managerA'));
    const reports = await prisma.user.findMany({
      where: { managerId: users.managerA.id },
      select: { id: true },
    });
    const inScope = new Set(reports.map((row) => row.id));

    expect(new Set(model.scope.subjects.map((subject) => subject.id))).toEqual(inScope);
    for (const owner of ownersIn(model, 'tasks')) expect(inScope.has(owner)).toBe(true);
    expect(ownersIn(model, 'tasks').has(users.recruitB.id)).toBe(false);
    expect(inScope.has(users.managerA.id)).toBe(false);
  });

  it('fails the whole report rather than dropping the out-of-scope id', async () => {
    const result = await json(
      {
        ...RANGE,
        scope_type: 'USERS',
        user_ids: [users.recruitA.id, users.recruitB.id],
        sections: ['TASKS'],
      },
      'managerA'
    );

    expect(result.status).toBe(403);
    expect(result.json.error?.code).toBe('OUT_OF_SCOPE');
    // The position is named, never the identity: the message must not confirm
    // who that id belongs to.
    expect(JSON.stringify(result.json.error?.details)).toContain('user_ids[1]');
    expect(JSON.stringify(result.json.error)).not.toContain(users.recruitB.id);
  });

  it('records the refused attempt as a DENIED report run', async () => {
    await json(
      { ...RANGE, scope_type: 'USERS', user_ids: [users.recruitB.id], sections: ['TASKS'] },
      'managerA'
    );

    const run = await eventually(() =>
      prisma.reportRun.findFirst({
        where: { requestedById: users.managerA.id, status: 'DENIED' },
        orderBy: { createdAt: 'desc' },
      })
    );

    expect(run.errorCode).toBe('OUT_OF_SCOPE');
    expect(run.targetUserIds).toEqual([users.recruitB.id]);
    expect(run.rowCount).toBe(0);
  });

  it('refuses an organisation-wide report', async () => {
    const result = await json({ ...RANGE, scope_type: 'ORG', sections: ['TASKS'] }, 'managerA');
    expect(result.status).toBe(403);
    expect(result.json.error?.code).toBe('INSUFFICIENT_ROLE');
  });

  it('refuses a notes section on somebody else’s report', async () => {
    const result = await json({ ...RANGE, scope_type: 'USERS', sections: ['NOTES'] }, 'managerA');
    expect(result.status).toBe(403);
    expect(result.json.error?.code).toBe('SECTION_NOT_PERMITTED');
  });

  it('reports on its own notes happily', async () => {
    const model = report(await json({ ...RANGE, scope_type: 'SELF', sections: ['NOTES'] }, 'managerA'));
    expect(ownersIn(model, 'notes').has(users.recruitA.id)).toBe(false);
  });
});

describe('privacy inside a permitted scope', () => {
  it('omits admin-only feedback from a manager’s report and says how much was withheld', async () => {
    const model = report(
      await json(
        { ...RANGE, scope_type: 'USER', user_ids: [users.recruitA.id], sections: ['FEEDBACK'] },
        'managerA'
      )
    );

    const subjects = rowsOf(model, 'feedback').map((row) => String(row.subject));
    expect(subjects).not.toContain('Escalation about my manager');
    expect(model.withheld.feedback).toBeGreaterThan(0);

    // A manager reading what they are allowed to read is ordinary, not
    // privileged: the audit table would be useless if every roster read landed
    // in it.
    const audit = await prisma.auditLog.findFirst({
      where: { action: 'ENTRY.READ_PRIVILEGED', actorUserId: users.managerA.id },
    });
    expect(audit).toBeNull();
  });

  it('counts the withheld feedback over the same population the filter selected', async () => {
    const filtered = report(
      await json(
        {
          ...RANGE,
          scope_type: 'USER',
          user_ids: [users.recruitA.id],
          sections: ['FEEDBACK'],
          filters: { feedback: { type: ['POSITIVE'] } },
        },
        'managerA'
      )
    );

    // The fixture's hidden entry is a CONCERN, so a report restricted to
    // POSITIVE must not claim it was withheld from this report.
    const positiveAdminOnly = await prisma.feedbackEntry.count({
      where: {
        ownerId: users.recruitA.id,
        deletedAt: null,
        visibility: 'ADMIN_ONLY',
        type: 'POSITIVE',
        entryDate: { gte: new Date(RANGE.date_from), lte: new Date(RANGE.date_to) },
      },
    });

    expect(filtered.withheld.feedback).toBe(positiveAdminOnly);

    const concerns = report(
      await json(
        {
          ...RANGE,
          scope_type: 'USER',
          user_ids: [users.recruitA.id],
          sections: ['FEEDBACK'],
          filters: { feedback: { type: ['CONCERN'] } },
        },
        'managerA'
      )
    );

    expect(concerns.withheld.feedback).toBeGreaterThan(filtered.withheld.feedback);
  });

  it('includes it for an admin, and audits the privileged read', async () => {
    const model = report(
      await json(
        { ...RANGE, scope_type: 'USER', user_ids: [users.recruitA.id], sections: ['FEEDBACK', 'NOTES'] },
        'admin'
      )
    );

    expect(rowsOf(model, 'feedback').map((row) => String(row.subject))).toContain(
      'Escalation about my manager'
    );
    expect(rowsOf(model, 'notes').map((row) => String(row.title))).toContain('Private reflection');
    expect(model.withheld.feedback).toBe(0);

    // Both sections are privileged, and the two rows can share a timestamp, so
    // the note read is asked for by name rather than by being the newest row.
    const audit = await eventually(() =>
      prisma.auditLog.findFirst({
        where: {
          action: 'ENTRY.READ_PRIVILEGED',
          actorUserId: users.admin.id,
          targetUserId: users.recruitA.id,
          entityType: 'NOTE',
        },
        orderBy: { id: 'desc' },
      })
    );

    expect(audit.entityType).toBe('NOTE');
  });
});

describe('admin scopes', () => {
  it('covers everybody for an organisation report', async () => {
    const model = report(await json({ ...RANGE, scope_type: 'ORG', sections: ['TASKS'] }, 'admin'));
    const subjects = new Set(model.scope.subjects.map((subject) => subject.id));

    for (const key of ['recruitA', 'recruitB', 'unassigned'] as const) {
      expect(subjects.has(users[key].id)).toBe(true);
    }
  });

  it('covers exactly one department’s members', async () => {
    const department = await prisma.department.findFirstOrThrow({
      where: { users: { some: { id: users.recruitA.id } } },
      select: { id: true },
    });

    const model = report(
      await json(
        { ...RANGE, scope_type: 'DEPARTMENT', department_id: department.id, sections: ['TASKS'] },
        'admin'
      )
    );

    const members = await prisma.user.findMany({
      where: { departmentId: department.id },
      select: { id: true },
    });

    expect(new Set(model.scope.subjects.map((subject) => subject.id))).toEqual(
      new Set(members.map((member) => member.id))
    );
    for (const owner of ownersIn(model, 'tasks')) {
      expect(members.some((member) => member.id === owner)).toBe(true);
    }
  });

  it('produces an empty report for a department with no members, not the whole organisation', async () => {
    const department = await prisma.department.create({
      data: { name: `Empty ${Date.now()}` },
      select: { id: true },
    });

    try {
      const model = report(
        await json(
          { ...RANGE, scope_type: 'DEPARTMENT', department_id: department.id, sections: ['TASKS'] },
          'admin'
        )
      );

      expect(model.scope.subjects).toEqual([]);
      expect(rowsOf(model, 'tasks')).toEqual([]);
      expect(model.summary?.totals.tasks_total).toBe(0);
    } finally {
      await prisma.department.delete({ where: { id: department.id } });
    }
  });

  it('404s an unknown department rather than confirming the id', async () => {
    const result = await json(
      {
        ...RANGE,
        scope_type: 'DEPARTMENT',
        department_id: '11111111-1111-4111-8111-111111111111',
        sections: ['TASKS'],
      },
      'admin'
    );
    expect(result.status).toBe(404);
  });
});

describe('content, filters and metadata', () => {
  it('carries the header metadata a printed report needs', async () => {
    const model = report(await json({ ...RANGE, scope_type: 'SELF', sections: ['TASKS'] }, 'recruitA'));

    expect(model.generated_by).toMatchObject({ id: users.recruitA.id, role: 'RECRUIT' });
    expect(model.period).toEqual({ date_from: RANGE.date_from, date_to: RANGE.date_to });
    expect(model.confidentiality.length).toBeGreaterThan(0);
    expect(model.report_id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('applies section filters and records what was applied', async () => {
    const model = report(
      await json(
        {
          ...RANGE,
          scope_type: 'SELF',
          sections: ['TASKS'],
          filters: { tasks: { status: ['DONE'] } },
        },
        'recruitA'
      )
    );

    expect(rowsOf(model, 'tasks').every((row) => row.status === 'DONE')).toBe(true);
    expect(model.filters_applied['tasks.status']).toBe('DONE');
  });

  it('honours a date range that excludes everything', async () => {
    const model = report(
      await json(
        { scope_type: 'SELF', date_from: '2001-01-01', date_to: '2001-01-02', sections: ['TASKS'] },
        'recruitA'
      )
    );

    expect(rowsOf(model, 'tasks')).toEqual([]);
    expect(model.summary?.totals.tasks_total).toBe(0);
  });

  it('drops the detail rows but keeps the summary when details are not wanted', async () => {
    const model = report(
      await json({ ...RANGE, scope_type: 'SELF', sections: ['TASKS'], include_details: false }, 'recruitA')
    );

    expect(model.sections).toEqual([]);
    expect(model.summary?.per_user.length).toBe(1);
  });

  it('records a successful generation in both the audit log and the run table', async () => {
    await json({ ...WIDE, scope_type: 'SELF', sections: ['TASKS'] }, 'recruitA');

    const run = await eventually(() =>
      prisma.reportRun.findFirst({
        where: { requestedById: users.recruitA.id, status: 'SUCCESS' },
        orderBy: { createdAt: 'desc' },
      })
    );
    expect(run.scopeType).toBe('SELF');
    expect(run.format).toBe('JSON');
    expect(run.durationMs).toBeGreaterThanOrEqual(0);

    const audit = await eventually(() =>
      prisma.auditLog.findFirst({
        where: { action: 'REPORT.GENERATED', actorUserId: users.recruitA.id },
        orderBy: { createdAt: 'desc' },
      })
    );
    expect(JSON.stringify(audit.after)).not.toContain('HYPERLINK');
  });
});

describe('CSV export', () => {
  it('downloads as a named UTF-8 file that is not cached', async () => {
    const { status, response } = await post(
      { ...RANGE, scope_type: 'SELF', sections: ['TASKS'], format: 'CSV' },
      'recruitA'
    );

    expect(status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/csv; charset=utf-8');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('content-disposition')).toContain('attachment; filename="onboarding-report_');
    expect(response.headers.get('content-disposition')).toContain(`_${RANGE.date_from}_${RANGE.date_to}.csv`);

    // `Response.text()` strips the BOM as part of UTF-8 decoding, so the bytes
    // are what has to be checked here.
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([bytes[0], bytes[1], bytes[2]]).toEqual([0xef, 0xbb, 0xbf]);

    const body = new TextDecoder('utf-8').decode(bytes).slice(1);
    expect(body).toContain('\r\n');
    // The formula-titled task is neutralised and its quotes/newline escaped.
    expect(body).toContain('"\'=HYPERLINK(""http://evil.example"",""payslip"")"');
  });

  it('writes one table with a record_type column for a combined export', async () => {
    const { response } = await post(
      { ...RANGE, scope_type: 'SELF', sections: ['TASKS', 'ISSUES'], format: 'CSV' },
      'recruitA'
    );

    const body = await response.text();
    expect(body.split('\r\n')[0].startsWith('record_type,')).toBe(true);
  });

  it('cannot be used to export somebody else’s diary', async () => {
    const { status, response } = await post(
      { ...RANGE, scope_type: 'USER', user_ids: [users.recruitB.id], sections: ['TASKS'], format: 'CSV' },
      'managerA'
    );

    expect(status).toBe(403);
    expect(response.headers.get('content-type')).toContain('application/json');
  });

  it('records the export format in the run metadata', async () => {
    await post({ ...WIDE, scope_type: 'SELF', sections: ['TASKS'], format: 'CSV' }, 'managerB');

    const run = await eventually(() =>
      prisma.reportRun.findFirst({
        where: { requestedById: users.managerB.id, format: 'CSV' },
        orderBy: { createdAt: 'desc' },
      })
    );
    expect(run.status).toBe('SUCCESS');
  });
});

/**
 * The PDF is the copy that gets attached to an email and printed for a
 * probation review, so what matters here is what a reader can find in it —
 * hence the text is extracted back out of the document rather than trusting
 * that the renderer was handed the right model.
 */
describe('PDF export', () => {
  it('downloads as a named PDF that is not cached', async () => {
    const { status, response } = await post(
      { ...RANGE, scope_type: 'SELF', sections: ['TASKS'], format: 'PDF' },
      'recruitA'
    );

    expect(status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('content-disposition')).toContain('attachment; filename="onboarding-report_');
    expect(response.headers.get('content-disposition')).toContain(`_${RANGE.date_from}_${RANGE.date_to}.pdf`);
    expect(response.headers.get('content-disposition')).toContain("filename*=UTF-8''");

    const bytes = new Uint8Array(await response.arrayBuffer());
    expect(Buffer.from(bytes.slice(0, 5)).toString('latin1')).toBe('%PDF-');
  });

  it('shows a recruit their own entries, including their private note', async () => {
    const { response } = await post(
      { ...RANGE, scope_type: 'SELF', sections: ['TASKS', 'NOTES'], format: 'PDF' },
      'recruitA'
    );
    const text = (await pdfPageTexts(new Uint8Array(await response.arrayBuffer()))).join('\n');

    expect(text).toContain('Nobody else reads this');
    expect(text).toContain('HYPERLINK');
  });

  it('carries no private note and no admin-only feedback into a manager’s PDF', async () => {
    const { response } = await post(
      {
        ...RANGE,
        scope_type: 'USERS',
        user_ids: [users.recruitA.id],
        sections: ['TASKS', 'ISSUES', 'FEEDBACK'],
        format: 'PDF',
      },
      'managerA'
    );
    const text = (await pdfPageTexts(new Uint8Array(await response.arrayBuffer()))).join('\n');

    expect(text).not.toContain('Nobody else reads this');
    expect(text).not.toContain('Private reflection');
    expect(text).not.toContain('Escalation about my manager');
    expect(text).not.toContain('Not for the manager to read');
    // The withholding is stated rather than silently applied.
    expect(text).toContain('admin-only feedback');
  });

  it('carries no recruit from outside the manager’s team', async () => {
    const { response } = await post(
      { ...RANGE, scope_type: 'USERS', sections: ['TASKS'], format: 'PDF' },
      'managerA'
    );
    const text = (await pdfPageTexts(new Uint8Array(await response.arrayBuffer()))).join('\n');

    expect(text).toContain('Priya Sharma');
    expect(text).not.toContain('Aisha Khan');
    expect(text).not.toContain('Noah Silva');
  });

  it('lets an admin read the note and the admin-only feedback the manager could not', async () => {
    const { response } = await post(
      {
        ...RANGE,
        scope_type: 'USER',
        user_ids: [users.recruitA.id],
        sections: ['NOTES', 'FEEDBACK'],
        format: 'PDF',
      },
      'admin'
    );
    const text = (await pdfPageTexts(new Uint8Array(await response.arrayBuffer()))).join('\n');

    expect(text).toContain('Nobody else reads this');
    expect(text).toContain('Escalation about my manager');
  });

  it('refuses an out-of-scope target instead of returning a narrowed document', async () => {
    const { status, response } = await post(
      {
        ...RANGE,
        scope_type: 'USERS',
        user_ids: [users.recruitA.id, users.recruitB.id],
        sections: ['TASKS'],
        format: 'PDF',
      },
      'managerA'
    );

    expect(status).toBe(403);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(((await response.json()) as Json).error?.code).toBe('OUT_OF_SCOPE');
  });

  it('records the PDF run in the report metadata', async () => {
    await post({ ...WIDE, scope_type: 'SELF', sections: ['TASKS'], format: 'PDF' }, 'managerB');

    const run = await eventually(() =>
      prisma.reportRun.findFirst({
        where: { requestedById: users.managerB.id, format: 'PDF' },
        orderBy: { createdAt: 'desc' },
      })
    );
    expect(run.status).toBe('SUCCESS');
  });
});
