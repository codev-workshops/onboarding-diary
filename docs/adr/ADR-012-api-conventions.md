# ADR-012. HTTP API conventions

- **Status**: Accepted
- **Date**: 2026-09-08
- **Deciders**: Project owner

## Context

Nine endpoint groups will be added across milestones M1–M7, each by a different slice of work.
Without conventions fixed up front, paging, filtering, and error shapes drift between features,
and the frontend ends up with per-endpoint special cases.

## Decision

All endpoints follow one contract:

- **Versioned base path** `/api/v1`, resource-plural routes, grouped per feature with
  `MapGroup(...).RequireAuthorization()`.
- **Errors are RFC 7807 `ProblemDetails`** for every failure, including validation
  (`ValidationProblem` with a field-keyed `errors` object), produced by a shared endpoint filter
  and a global exception handler that attaches a correlation id.
- **Status codes**: 200 read, 201 create with `Location`, 204 delete, 400/422 validation,
  401 unauthenticated, 403 authenticated but not permitted, 404 not found *and* for resources
  outside the caller's scope, 409 conflict, 429 rate limited.
- **Lists are always paged**: `page`, `page_size` (default 20, max 100), `sort` (`-field` for
  descending), returning `{ items, page, page_size, total }`.
- **Filters are query parameters** with names shared across features where the meaning is the
  same (`from`, `to`, `q`, `user_id`).
- **Payload casing** is camelCase JSON; dates are ISO-8601; enums are their string names.

## Consequences

- The frontend has one client, one error renderer, and one paging component for every screen.
- Conventions are enforced by shared filters and binders rather than by review discipline.
- The `\/v1` prefix leaves room for a breaking change later without inventing a scheme then.
- Returning 404 instead of 403 for out-of-scope resources hides existence, at the cost of
  slightly less precise diagnostics for legitimate users.

## Alternatives considered

- **Ad-hoc error shapes per endpoint** — less upfront work, but pushes the branching into the
  client.
- **Unpaged list endpoints** — simpler until a recruit accumulates hundreds of entries and every
  list screen degrades at once.
