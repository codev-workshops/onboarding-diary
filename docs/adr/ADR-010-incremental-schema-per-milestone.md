# ADR-010. Introduce schema incrementally per milestone

- **Status**: Accepted
- **Date**: 2026-09-08
- **Deciders**: Project owner

## Context

The first plan created every table — users, departments, tasks, issues, feedback, notes — in the
M0 foundation milestone, before any of those features existed. The project owner directed that
M0 establish only the `User` and `Department` foundation, with each entry table arriving in the
milestone that implements its vertical slice.

## Decision

Each milestone that needs new tables ships **its own EF Core migration**. M0 contains only
`User` and `Department`; `TaskEntry` arrives with M2, the issue, feedback, and note tables with
M3, and any extension tables with M7.

## Consequences

- Schema and behaviour are always reviewed together; there are no unused tables in the database.
- Every milestone is a working vertical slice, so the app is runnable and demonstrable at each
  step.
- More migrations overall, and a cross-cutting model change late in the sequence may touch
  several of them.

## Alternatives considered

- **Full schema up front** — one migration and a stable model early, but ships speculative
  tables and invites design decisions made before the feature is understood.
