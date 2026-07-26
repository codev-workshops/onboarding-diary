/** User directory, profile updates, and manager assignment (TRD 4.3). */

import type {
  DirectReportSummaryDto,
  ListUsersQuery,
  PaginationMeta,
  Role,
  UpdateOwnProfileBody,
  UpdateUserBody,
  UserDto,
} from '@onboarding-diary/shared';

import { resolveEntryAccess, type Caller } from '../../access/entryAccess.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../lib/errors.js';
import { buildMeta, toPrismaPage, type PageParams } from '../../lib/pagination.js';
import type { Db } from '../../lib/prisma.js';
import { toUserDto } from '../../serializers/user.js';

/** How far the manager chain is walked when checking for cycles. */
const MAX_CHAIN_DEPTH = 50;

export async function getUserById(db: Db, id: string): Promise<UserDto> {
  const user = await db.user.findUnique({ where: { id } });
  if (user === null) throw new NotFoundError('User not found');
  return toUserDto(user);
}

export async function readUser(db: Db, caller: Caller, id: string): Promise<UserDto> {
  const user = await db.user.findUnique({ where: { id } });
  if (user === null) throw new NotFoundError('User not found');
  const access = resolveEntryAccess(caller, { id: user.id, managerId: user.managerId });
  if (!access.canRead) throw new ForbiddenError('You do not have access to this user');
  return toUserDto(user);
}

export async function updateOwnProfile(
  db: Db,
  callerId: string,
  body: UpdateOwnProfileBody,
): Promise<UserDto> {
  // Only the three self-editable columns are ever written, so `role` and `email` in a
  // request body are inert (FR-A6).
  const data: { fullName?: string; department?: string | null; startDate?: Date | null } = {};
  if (body.fullName !== undefined) data.fullName = body.fullName;
  if (body.department !== undefined) data.department = body.department;
  if (body.startDate !== undefined) {
    data.startDate = body.startDate === null ? null : new Date(`${body.startDate}T00:00:00.000Z`);
  }

  const user = await db.user.update({ where: { id: callerId }, data });
  return toUserDto(user);
}

export async function listUsers(
  db: Db,
  query: ListUsersQuery,
  page: PageParams,
): Promise<{ data: UserDto[]; meta: PaginationMeta }> {
  const where = {
    ...(query.q === undefined
      ? {}
      : {
          OR: [
            { fullName: { contains: query.q, mode: 'insensitive' as const } },
            { email: { contains: query.q, mode: 'insensitive' as const } },
          ],
        }),
    ...(query.role === undefined ? {} : { role: query.role }),
    ...(query.department === undefined
      ? {}
      : { department: { equals: query.department, mode: 'insensitive' as const } }),
    ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
  };

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: [{ fullName: 'asc' }, { createdAt: 'asc' }],
      ...toPrismaPage(page),
    }),
    db.user.count({ where }),
  ]);

  return { data: users.map(toUserDto), meta: buildMeta(page, total) };
}

/**
 * Walk up from `candidateManagerId`; if the chain reaches `userId` the assignment would
 * create a cycle (FR-U6).
 */
export async function wouldCreateManagerCycle(
  db: Db,
  userId: string,
  candidateManagerId: string,
): Promise<boolean> {
  let cursor: string | null = candidateManagerId;
  for (let depth = 0; cursor !== null && depth < MAX_CHAIN_DEPTH; depth += 1) {
    if (cursor === userId) return true;
    const next: { managerId: string | null } | null = await db.user.findUnique({
      where: { id: cursor },
      select: { managerId: true },
    });
    cursor = next?.managerId ?? null;
  }
  return false;
}

export async function updateUserAsAdmin(
  db: Db,
  admin: Caller,
  targetId: string,
  body: UpdateUserBody,
): Promise<UserDto> {
  const target = await db.user.findUnique({ where: { id: targetId } });
  if (target === null) throw new NotFoundError('User not found');

  if (target.id === admin.id && body.role !== undefined && body.role !== 'ADMIN') {
    throw new ValidationError('Request validation failed', [
      { field: 'role', message: 'You cannot change your own role' },
    ]);
  }
  if (target.id === admin.id && body.isActive === false) {
    throw new ValidationError('Request validation failed', [
      { field: 'isActive', message: 'You cannot deactivate your own account' },
    ]);
  }

  const data: { role?: Role; isActive?: boolean; managerId?: string | null } = {};
  if (body.role !== undefined) data.role = body.role;
  if (body.isActive !== undefined) data.isActive = body.isActive;

  if (body.managerId !== undefined) {
    const managerId = body.managerId ?? null;
    if (managerId === target.id) {
      throw new ValidationError('Request validation failed', [
        { field: 'managerId', message: 'A user cannot manage themselves' },
      ]);
    }
    if (managerId !== null) {
      const manager = await db.user.findUnique({ where: { id: managerId } });
      if (manager === null) {
        throw new ValidationError('Request validation failed', [
          { field: 'managerId', message: 'Manager not found' },
        ]);
      }
      if (await wouldCreateManagerCycle(db, target.id, managerId)) {
        throw new ConflictError('That assignment would create a management cycle');
      }
    }
    data.managerId = managerId;
  }

  const updated = await db.user.update({ where: { id: target.id }, data });

  if (body.isActive === false) {
    // A deactivated user must not be able to mint new access tokens.
    await db.refreshToken.updateMany({
      where: { userId: target.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  return toUserDto(updated);
}

export async function listDirectReports(
  db: Db,
  managerId: string,
): Promise<DirectReportSummaryDto[]> {
  const reports = await db.user.findMany({
    where: { managerId },
    orderBy: [{ fullName: 'asc' }],
  });
  if (reports.length === 0) return [];

  const ownerIds = reports.map((report) => report.id);
  const [taskGroups, openIssueGroups, latest] = await Promise.all([
    db.taskEntry.groupBy({
      by: ['ownerId', 'status'],
      where: { ownerId: { in: ownerIds } },
      _count: { _all: true },
    }),
    db.issueEntry.groupBy({
      by: ['ownerId'],
      where: { ownerId: { in: ownerIds }, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      _count: { _all: true },
    }),
    lastActivityDates(db, ownerIds),
  ]);

  return reports.map((report) => {
    const groups = taskGroups.filter((group) => group.ownerId === report.id);
    const total = groups.reduce((sum, group) => sum + group._count._all, 0);
    const completed = groups
      .filter((group) => group.status === 'DONE')
      .reduce((sum, group) => sum + group._count._all, 0);
    return {
      user: toUserDto(report),
      taskProgress: {
        completed,
        total,
        completionPercent: total === 0 ? 0 : Math.round((completed / total) * 100),
      },
      openIssueCount:
        openIssueGroups.find((group) => group.ownerId === report.id)?._count._all ?? 0,
      lastActivityDate: latest.get(report.id) ?? null,
    };
  });
}

/** Newest `entryDate` per owner across all four entry types. */
async function lastActivityDates(db: Db, ownerIds: string[]): Promise<Map<string, string>> {
  const rows = await db.$queryRaw<{ ownerId: string; lastActivityDate: Date }[]>`
    SELECT "ownerId", MAX("entryDate") AS "lastActivityDate"
    FROM (
      SELECT "ownerId", "entryDate" FROM "TaskEntry" WHERE "ownerId" = ANY(${ownerIds}::uuid[])
      UNION ALL
      SELECT "ownerId", "entryDate" FROM "IssueEntry" WHERE "ownerId" = ANY(${ownerIds}::uuid[])
      UNION ALL
      SELECT "ownerId", "entryDate" FROM "FeedbackNote" WHERE "ownerId" = ANY(${ownerIds}::uuid[])
      UNION ALL
      SELECT "ownerId", "entryDate" FROM "Note" WHERE "ownerId" = ANY(${ownerIds}::uuid[])
    ) AS entries
    GROUP BY "ownerId"
  `;
  return new Map(rows.map((row) => [row.ownerId, row.lastActivityDate.toISOString().slice(0, 10)]));
}
