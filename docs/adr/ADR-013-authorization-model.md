# ADR-013. Role and resource-based authorization model

- **Status**: Accepted
- **Date**: 2026-09-08
- **Deciders**: Project owner

## Context

Three roles with sharply different rights: recruits own their entries, managers get strictly
read-only access to assigned recruits (no editing, no commenting), and admins manage users and
read everything. Nearly every endpoint is scoped by role *and* by relationship, which is the
highest-risk area in the product: a mistake leaks another person's diary.

## Decision

Authorization is enforced **server-side on every endpoint**, in two layers:

1. **Claim-based policies** for coarse gating: `AdminOnly`, `RecruitOnly`, `ManagerOrAdmin`.
2. **A resource handler** (`EntryAccessHandler`) for the relationship check, resolving the caller
   against the target entry or the `user_id` query parameter as *owner* (read and write),
   *assigned manager* (read only), *admin* (read only), or *no access*.

Rules that fall out of it: managers and admins never write entry data; a request for a recruit
who is not assigned to the caller returns 404, not 403; the frontend's route guards are a UX
convenience only and are never trusted.

Permission tests are table-driven across `{recruit-own, recruit-other, assigned-manager,
unassigned-manager, admin, anonymous}` for every endpoint.

## Consequences

- One place to change when the role model changes, instead of per-endpoint `if` statements.
- Every new endpoint must declare a policy and, if it touches entry data, go through the
  resource handler — enforced by the table-driven test suite failing on omissions.
- Deactivating a user blocks new logins but does not invalidate an already-issued token
  (see ADR-006).

## Alternatives considered

- **Inline checks in each handler** — fine for two endpoints, unreviewable across forty.
- **Row-level filtering in the DbContext** — implicit and easy to bypass with a new query path;
  explicit authorization keeps the rule visible at the endpoint.
