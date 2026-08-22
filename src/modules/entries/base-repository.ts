import { notFound } from '@/src/modules/authz/errors';
import type { EntryKind } from '@/src/modules/authz/policy';
import { ownerFilter, readableUserIds, resolveOwnerFilter, type Actor } from '@/src/modules/authz/scope';

/**
 * The only `where` an entry query is ever built from. Every clause here is
 * authorization or soft deletion — feature filters are merged in by the caller
 * on top of it, never in place of it.
 */
export type EntryWhere = {
  id?: string;
  deletedAt: null;
  ownerId?: { in: string[] };
  OR?: { ownerId?: string; visibility?: { not: 'ADMIN_ONLY' } }[];
};

export type EntryDelegate<Row> = {
  findMany(args: {
    where: EntryWhere;
    orderBy?: Record<string, 'asc' | 'desc'>[];
    skip?: number;
    take?: number;
  }): Promise<Row[]>;
  findFirst(args: { where: EntryWhere }): Promise<Row | null>;
  count(args: { where: EntryWhere }): Promise<number>;
};

export type ScopedListOptions = {
  ownerId?: string;
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
export async function scopedEntryWhere(
  actor: Actor,
  kind: EntryKind,
  options: { ownerId?: string } = {}
): Promise<EntryWhere> {
  // Notes never leave their owner, so scope resolution is not even consulted;
  // an admin is the sole exception and reads them as a privileged action.
  if (kind === 'NOTE' && actor.role !== 'ADMIN') {
    if (options.ownerId && options.ownerId !== actor.id) throw notFound();
    return { deletedAt: null, ownerId: { in: [actor.id] } };
  }

  const where: EntryWhere = {
    deletedAt: null,
    ...(options.ownerId
      ? await resolveOwnerFilter(actor, options.ownerId)
      : ownerFilter(await readableUserIds(actor))),
  };

  if (kind === 'FEEDBACK' && actor.role !== 'ADMIN') {
    where.OR = [{ ownerId: actor.id }, { visibility: { not: 'ADMIN_ONLY' } }];
  }

  return where;
}

/**
 * Wraps a Prisma delegate so that an entry table cannot be queried without the
 * predicate above. Route handlers and services get one of these; they never get
 * the delegate, which is what makes "no endpoint hand-rolls a scope check"
 * structurally true rather than a convention.
 */
export function createScopedRepository<Row>(kind: EntryKind, delegate: EntryDelegate<Row>) {
  return {
    kind,

    async list(actor: Actor, options: ScopedListOptions = {}): Promise<Row[]> {
      const { ownerId, ...page } = options;
      return delegate.findMany({ where: await scopedEntryWhere(actor, kind, { ownerId }), ...page });
    },

    async count(actor: Actor, options: { ownerId?: string } = {}): Promise<number> {
      return delegate.count({ where: await scopedEntryWhere(actor, kind, options) });
    },

    /** Null rather than throwing, so a caller can choose 404 versus a redirect. */
    async findById(actor: Actor, id: string): Promise<Row | null> {
      const where = await scopedEntryWhere(actor, kind);
      return delegate.findFirst({ where: { ...where, id } });
    },

    /** The usual case: an unreachable id is indistinguishable from a missing one. */
    async findByIdOrThrow(actor: Actor, id: string): Promise<Row> {
      const row = await this.findById(actor, id);
      if (!row) throw notFound();
      return row;
    },
  };
}
