import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({ auditLog: { create: vi.fn() } }));
vi.mock('@/src/shared/db/prisma', () => ({ prisma: prismaMock }));

const { recordAudit } = await import('@/src/modules/audit/service');
const { withRequestContext } = await import('@/src/shared/http/request-context');

const context = {
  requestId: '4c3a2b1d-0000-4000-8000-000000000000',
  ip: '203.0.113.7',
  userAgent: 'vitest',
  actor: { id: '11111111-1111-4111-8111-111111111111', role: 'ADMIN' as const },
};

beforeEach(() => {
  prismaMock.auditLog.create.mockReset();
});

const lastRow = () => prismaMock.auditLog.create.mock.calls[0][0].data;

describe('recordAudit', () => {
  it('attributes the row to the request actor without being passed one', async () => {
    await withRequestContext(context, () => recordAudit({ action: 'AUTHZ.DENIED' }));

    expect(lastRow()).toMatchObject({
      actorUserId: context.actor.id,
      actorRole: 'ADMIN',
      ip: '203.0.113.7',
      requestId: context.requestId,
    });
  });

  it('records the length of long text rather than the text itself (DB8)', async () => {
    const body = 'x'.repeat(400);
    await withRequestContext(context, () =>
      recordAudit({ action: 'ENTRY.CROSS_USER_UPDATED', before: { description: body, title: 'Short' } })
    );

    expect(lastRow().before).toEqual({ description: { redacted: true, length: 400 }, title: 'Short' });
  });

  it('writes an unattributed row rather than failing when no session exists', async () => {
    await recordAudit({ action: 'AUTHZ.DENIED' });
    expect(lastRow()).toMatchObject({ actorUserId: null, actorRole: null });
  });
});
