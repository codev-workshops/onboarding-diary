import { entryDateSchema, issueSchema, noteSchema } from './diarySchemas';

describe('entryDateSchema', () => {
  const schema = entryDateSchema('2026-03-01', '2026-03-10');

  it('accepts today and the earliest allowed date', () => {
    expect(schema.safeParse('2026-03-10').success).toBe(true);
    expect(schema.safeParse('2026-01-30').success).toBe(true);
  });

  it('rejects future dates and dates more than 30 days before the start', () => {
    expect(schema.safeParse('2026-03-11').error?.issues[0].message).toBe(
      'Date cannot be in the future',
    );
    expect(schema.safeParse('2026-01-29').error?.issues[0].message).toBe(
      'Date cannot be earlier than 2026-01-30',
    );
  });
});

describe('issueSchema', () => {
  const base = {
    entryDate: '2026-01-10',
    title: 'VPN fails',
    description: '',
    severity: 'HIGH' as const,
    resolutionNotes: '',
    relatedTaskId: null,
  };

  it('requires resolution notes when resolved or closed', () => {
    const schema = issueSchema('2026-01-05');
    for (const status of ['RESOLVED', 'CLOSED'] as const) {
      const result = schema.safeParse({ ...base, status });
      expect(result.error?.issues[0].path).toEqual(['resolutionNotes']);
    }
    expect(schema.safeParse({ ...base, status: 'OPEN' }).success).toBe(true);
    expect(
      schema.safeParse({ ...base, status: 'CLOSED', resolutionNotes: 'Fixed by IT' }).success,
    ).toBe(true);
  });
});

describe('noteSchema', () => {
  it('limits the number and format of tags', () => {
    const schema = noteSchema('2026-01-05');
    const note = { entryDate: '2026-01-10', title: 'Week 1', content: 'Hi', shared: false };
    const eleven = Array.from({ length: 11 }, (_, i) => `tag${i}`);
    expect(schema.safeParse({ ...note, tags: eleven }).success).toBe(false);
    expect(schema.safeParse({ ...note, tags: ['a,b'] }).success).toBe(false);
    expect(schema.safeParse({ ...note, tags: ['git'] }).success).toBe(true);
  });
});
