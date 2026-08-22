import { Prisma, type PrismaClient } from '@prisma/client';

import { recordAudit } from '@/src/modules/audit/service';
import { notFound, versionConflict } from '@/src/modules/authz/errors';
import {
  assertCanCreateEntry,
  assertCanDeleteEntry,
  assertCanUpdateEntry,
  type EntryKind,
} from '@/src/modules/authz/policy';
import { ownerFilter, readableUserIds, resolveOwnerFilter, type Actor } from '@/src/modules/authz/scope';
import { prisma } from '@/src/shared/db/prisma';

/** The client or a transaction — writes take whichever the caller is inside. */
export type DbClient = PrismaClient | Prisma.TransactionClient;

/**
 * Feature filters (date range, status, search…) live under `AND` rather than
 * alongside the authorization clauses, so a filter can never overwrite one:
 * merging `{ ownerId: ... }` at the top level would silently widen scope. The
 * filter shape is the table's own Prisma `where` type, supplied by the
 * repository, so a filter stays type-checked without this module knowing the
 * table's columns.
 */
export type EntryWhere<Filter> = {
  id?: string;
  deletedAt: null;
  ownerId?: { in: string[] };
  OR?: { ownerId?: string; visibility?: { not: 'ADMIN_ONLY' } }[];
  AND?: Filter[];
};

export type ReadArgs<Filter> = {
  where: EntryWhere<Filter>;
  orderBy?: Record<string, 'asc' | 'desc'>[];
  skip?: number;
  take?: number;
};

/**
 * Bound accessors for one entry table. Repositories supply these closures over
 * a concrete Prisma delegate; nothing outside this module ever holds the
 * delegate itself, which is what makes "no caller can query an entry table
 * unscoped" structural rather than a convention.
 */
export type EntryAccessors<Row, CreateData, UpdateData, Filter> = {
  findMany(client: DbClient, args: ReadArgs<Filter>): Promise<Row[]>;
  findFirst(client: DbClient, args: { where: EntryWhere<Filter> }): Promise<Row | null>;
  count(client: DbClient, args: { where: EntryWhere<Filter> }): Promise<number>;
  create(client: DbClient, data: CreateData): Promise<Row>;
  /**
   * `guard` becomes part of the `WHERE` of the `UPDATE` itself. That is what
   * makes the version check a check and not a suggestion: without it the
   * comparison would sit in application code with an open window between the
   * read and the write.
   */
  update(client: DbClient, id: string, data: UpdateData, guard?: VersionGuard): Promise<Row>;
};

export type VersionGuard = { version: number };

export type UpdateOptions = { expectedVersion?: number };

export type ScopedListOptions<Filter> = {
  ownerId?: string;
  filters?: Filter[];
  orderBy?: Record<string, 'asc' | 'desc'>[];
  skip?: number;
  take?: number;
};

/**
 * Builds the authorization predicate for an entry table.
 *
 * Three things are true of every entry read in the application, and all three
 * are enforced here rather than at the call site:
 *
 *   1. `deleted_at IS NULL` — forgetting it in one query is a data leak of
 *      "deleted" content (DB13).
 *   2. `owner_id ∈ readable_user_ids(actor)` — resolved live, in SQL.
 *   3. Entitlement on top of scope: notes are owner-private even for the
 *      owner's manager, and ADMIN_ONLY feedback is owner-and-admin only.
 */
export async function scopedEntryWhere<Filter>(
  actor: Actor,
  kind: EntryKind,
  options: { ownerId?: string; filters?: Filter[] } = {}
): Promise<EntryWhere<Filter>> {
  const where = await authorizationWhere<Filter>(actor, kind, options.ownerId);
  if (options.filters?.length) where.AND = options.filters;
  return where;
}

/**
 * Whether the caller may read this owner's notes at all — the predicate behind
 * the note branch below, exposed because an aggregate cannot use the branch.
 * A direct read of somebody else's note is refused with a 404; a dashboard has
 * no single row to refuse, so it asks first and lets notes contribute nothing
 * rather than failing the whole page.
 */
export function canReadNotesOf(actor: Actor, ownerId?: string): boolean {
  return actor.role === 'ADMIN' || ownerId === undefined || ownerId === actor.id;
}

async function authorizationWhere<Filter>(
  actor: Actor,
  kind: EntryKind,
  ownerId?: string
): Promise<EntryWhere<Filter>> {
  // Notes never leave their owner, so scope resolution is not even consulted;
  // an admin is the sole exception and reads them as a privileged action.
  if (kind === 'NOTE' && actor.role !== 'ADMIN') {
    if (ownerId && ownerId !== actor.id) throw notFound();
    return { deletedAt: null, ownerId: { in: [actor.id] } };
  }

  const where: EntryWhere<Filter> = {
    deletedAt: null,
    ...(ownerId ? await resolveOwnerFilter(actor, ownerId) : ownerFilter(await readableUserIds(actor))),
  };

  if (kind === 'FEEDBACK' && actor.role !== 'ADMIN') {
    where.OR = [{ ownerId: actor.id }, { visibility: { not: 'ADMIN_ONLY' } }];
  }

  return where;
}

/**
 * Wraps a Prisma delegate so that an entry table cannot be read or written
 * without the predicate above and without the M3 policy having been consulted.
 * Services get one of these; they never get the delegate.
 */
export function createScopedRepository<
  Row extends { id: string; ownerId: string; version: number },
  CreateData,
  UpdateData,
  Filter,
>(kind: EntryKind, accessors: EntryAccessors<Row, CreateData, UpdateData, Filter>) {
  return {
    kind,

    async list(actor: Actor, options: ScopedListOptions<Filter> = {}): Promise<Row[]> {
      const { ownerId, filters, ...page } = options;
      return accessors.findMany(prisma, {
        where: await scopedEntryWhere(actor, kind, { ownerId, filters }),
        ...page,
      });
    },

    async count(actor: Actor, options: { ownerId?: string; filters?: Filter[] } = {}): Promise<number> {
      return accessors.count(prisma, { where: await scopedEntryWhere(actor, kind, options) });
    },

    /** Null rather than throwing, so a caller can choose 404 versus a redirect. */
    async findById(actor: Actor, id: string): Promise<Row | null> {
      const where = await scopedEntryWhere<Filter>(actor, kind);
      return accessors.findFirst(prisma, { where: { ...where, id } });
    },

    /** The usual case: an unreachable id is indistinguishable from a missing one. */
    async findByIdOrThrow(actor: Actor, id: string): Promise<Row> {
      const row = await this.findById(actor, id);
      if (!row) throw notFound();
      return row;
    },

    async create(actor: Actor, ownerId: string, data: CreateData): Promise<Row> {
      await assertCanCreateEntry(actor, ownerId);

      if (ownerId === actor.id) return accessors.create(prisma, data);

      // A write to somebody else's diary is the one entry event that must
      // always be audited (§22.1), and it commits with the row it describes.
      return prisma.$transaction(async (tx) => {
        const row = await accessors.create(tx, data);
        await recordAudit(
          {
            action: 'ENTRY.CROSS_USER_UPDATED',
            entityType: kind,
            entityId: row.id,
            targetUserId: ownerId,
            after: { operation: 'CREATE' },
          },
          tx
        );
        return row;
      });
    },

    /**
     * `changes` is the client-supplied field set, checked against the policy
     * allow-list before anything is written; `data` is the persisted shape the
     * service derived from it.
     */
    async update(
      actor: Actor,
      id: string,
      changes: Record<string, unknown>,
      toData: (existing: Row) => UpdateData,
      options: UpdateOptions = {}
    ): Promise<Row> {
      const existing = await this.findByIdOrThrow(actor, id);
      await assertCanUpdateEntry(actor, kind, existing, Object.keys(changes));

      const { expectedVersion } = options;
      if (expectedVersion !== undefined && existing.version !== expectedVersion) {
        throw versionConflict(existing.version);
      }

      const guard = expectedVersion === undefined ? undefined : { version: expectedVersion };
      const write = (client: DbClient) =>
        guarded(() => accessors.update(client, id, toData(existing), guard), existing.version);

      if (existing.ownerId === actor.id) return write(prisma);

      return prisma.$transaction(async (tx) => {
        const row = await write(tx);
        await recordAudit(
          {
            action: 'ENTRY.CROSS_USER_UPDATED',
            entityType: kind,
            entityId: id,
            targetUserId: existing.ownerId,
            before: pick(existing, Object.keys(changes)),
            after: { operation: 'UPDATE', ...changes },
          },
          tx
        );
        return row;
      });
    },

    /** Soft delete: the row stays, every read predicate stops returning it. */
    async softDelete(actor: Actor, id: string, toData: (deletedAt: Date) => UpdateData): Promise<void> {
      const existing = await this.findByIdOrThrow(actor, id);
      await assertCanDeleteEntry(actor, kind, existing);

      const data = toData(new Date());
      if (existing.ownerId === actor.id) {
        await accessors.update(prisma, id, data);
        return;
      }

      await prisma.$transaction(async (tx) => {
        await accessors.update(tx, id, data);
        await recordAudit(
          {
            action: 'ENTRY.CROSS_USER_UPDATED',
            entityType: kind,
            entityId: id,
            targetUserId: existing.ownerId,
            after: { operation: 'DELETE' },
          },
          tx
        );
      });
    },
  };
}

/**
 * Optimistic concurrency, and only when the caller opts in by sending
 * `expected_version`. The version is compared twice: once after the scoped read
 * so a mismatch answers 409 with the version to reload — and never before the
 * visibility check, so a stale version cannot be used to probe for entries the
 * caller cannot see — and once inside the `UPDATE` predicate, which is the
 * comparison that actually holds when two writers race. Prisma raises P2025
 * when the guarded row matched nothing, which here can only mean the version
 * moved between the read and the write.
 */
async function guarded<Row>(write: () => Promise<Row>, seenVersion: number): Promise<Row> {
  try {
    return await write();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw versionConflict(seenVersion);
    }
    throw error;
  }
}

function pick(row: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  return Object.fromEntries(keys.filter((key) => key in row).map((key) => [key, row[key]]));
}
