import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { authenticatedAs, bearer, buildTestApp } from './helpers/app.js';
import { disconnectTestDb, getTestDb, resetDatabase } from './helpers/database.js';
import { createFeedback, createNote, createUser } from './helpers/factories.js';

const testApp = buildTestApp();
const { agent, basePath } = testApp;
const db = getTestDb();

const RANGE = { from: '2026-07-01', to: '2026-07-31' };
const ALL_SECTIONS = ['TASKS', 'ISSUES', 'FEEDBACK', 'NOTES'];

beforeEach(resetDatabase);
afterAll(disconnectTestDb);

async function extractPdfText(body: Buffer): Promise<string> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: new Uint8Array(body) });
  try {
    const { text } = await parser.getText();
    return text;
  } finally {
    await parser.destroy();
  }
}

describe('POST /reports', () => {
  it('includes both boundary dates exactly once and excludes neighbours', async () => {
    const { user, token } = await authenticatedAs(testApp);
    await db.taskEntry.createMany({
      data: [
        { ownerId: user.id, entryDate: new Date('2026-06-30T00:00:00Z'), title: 'Before range' },
        { ownerId: user.id, entryDate: new Date('2026-07-01T00:00:00Z'), title: 'First day' },
        { ownerId: user.id, entryDate: new Date('2026-07-31T00:00:00Z'), title: 'Last day' },
        { ownerId: user.id, entryDate: new Date('2026-08-01T00:00:00Z'), title: 'After range' },
      ],
    });

    const response = await agent
      .post(`${basePath}/reports`)
      .set(...bearer(token))
      .send({ ...RANGE, sections: ['TASKS'], format: 'CSV' });

    expect(response.status).toBe(200);
    const csv = response.text;
    expect(csv.match(/First day/g)).toHaveLength(1);
    expect(csv.match(/Last day/g)).toHaveLength(1);
    expect(csv).not.toContain('Before range');
    expect(csv).not.toContain('After range');
  });

  it('rejects an inverted range and one longer than 366 days', async () => {
    const { token } = await authenticatedAs(testApp);

    const inverted = await agent
      .post(`${basePath}/reports`)
      .set(...bearer(token))
      .send({ from: '2026-07-31', to: '2026-07-01', sections: ['TASKS'], format: 'CSV' });
    expect(inverted.status).toBe(422);
    expect(inverted.body.error.details[0].field).toBe('from');

    const tooLong = await agent
      .post(`${basePath}/reports`)
      .set(...bearer(token))
      .send({ from: '2025-01-01', to: '2026-07-01', sections: ['TASKS'], format: 'CSV' });
    expect(tooLong.status).toBe(422);
    expect(tooLong.body.error.details[0].field).toBe('to');
  });

  it('streams a CSV with download headers and a descriptive filename', async () => {
    const { user, token } = await authenticatedAs(testApp, 'RECRUIT', { fullName: 'Nadia Khan' });
    await createFeedback(user.id, { subject: 'Buddy system', daysAgo: 0 });

    const response = await agent
      .post(`${basePath}/reports`)
      .set(...bearer(token))
      .send({ from: '2026-01-01', to: '2026-12-31', sections: ALL_SECTIONS, format: 'CSV' });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="onboarding-diary_nadia-khan_2026-01-01_2026-12-31.csv"',
    );
    for (const section of ALL_SECTIONS) expect(response.text).toContain(`# SECTION: ${section}`);
  });

  it('streams a PDF whose text carries the cover block and section headings', async () => {
    const { user, token } = await authenticatedAs(testApp, 'RECRUIT', {
      fullName: 'Nadia Khan',
      department: 'Engineering',
    });
    await createNote(user.id, { title: 'Retro thoughts', daysAgo: 0, tags: ['setup'] });

    const response = await agent
      .post(`${basePath}/reports`)
      .set(...bearer(token))
      .send({ from: '2026-01-01', to: '2026-12-31', sections: ALL_SECTIONS, format: 'PDF' })
      .buffer()
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.headers['content-disposition']).toContain('.pdf"');

    const body = response.body as Buffer;
    expect(body.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(body.byteLength).toBeGreaterThan(1000);

    const text = await extractPdfText(body);
    expect(text).toContain('Nadia Khan');
    expect(text).toContain('2026-01-01 to 2026-12-31');
    for (const section of ALL_SECTIONS) expect(text).toContain(section);
    expect(text).toContain('Retro thoughts');
  });

  it('produces a valid file that states there are no entries, in both formats', async () => {
    const { token } = await authenticatedAs(testApp);

    const csv = await agent
      .post(`${basePath}/reports`)
      .set(...bearer(token))
      .send({ ...RANGE, sections: ALL_SECTIONS, format: 'CSV' });
    expect(csv.status).toBe(200);
    expect(csv.text.match(/# No entries for this range/g)).toHaveLength(4);

    const pdf = await agent
      .post(`${basePath}/reports`)
      .set(...bearer(token))
      .send({ ...RANGE, sections: ALL_SECTIONS, format: 'PDF' })
      .buffer()
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });
    expect(pdf.status).toBe(200);
    expect(await extractPdfText(pdf.body as Buffer)).toContain('No entries for this range');
  });

  it('enforces the access matrix on the requested owner', async () => {
    const manager = await authenticatedAs(testApp, 'MANAGER');
    const report = await createUser({ managerId: manager.user.id });
    const stranger = await createUser();
    const recruit = await authenticatedAs(testApp);
    const admin = await authenticatedAs(testApp, 'ADMIN');

    const body = { ...RANGE, sections: ['TASKS'], format: 'CSV' as const };

    const forSelf = await agent
      .post(`${basePath}/reports`)
      .set(...bearer(recruit.token))
      .send(body);
    expect(forSelf.status).toBe(200);

    const forReport = await agent
      .post(`${basePath}/reports`)
      .set(...bearer(manager.token))
      .send({ ...body, ownerId: report.id });
    expect(forReport.status).toBe(200);

    const forNonReport = await agent
      .post(`${basePath}/reports`)
      .set(...bearer(manager.token))
      .send({ ...body, ownerId: stranger.id });
    expect(forNonReport.status).toBe(403);

    const recruitForOther = await agent
      .post(`${basePath}/reports`)
      .set(...bearer(recruit.token))
      .send({ ...body, ownerId: report.id });
    expect(recruitForOther.status).toBe(403);

    const adminForAnyone = await agent
      .post(`${basePath}/reports`)
      .set(...bearer(admin.token))
      .send({ ...body, ownerId: stranger.id });
    expect(adminForAnyone.status).toBe(200);
  });
});
