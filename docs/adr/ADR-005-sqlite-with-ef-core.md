# ADR-005. SQLite via EF Core as the datastore

- **Status**: Accepted
- **Date**: 2026-09-08
- **Deciders**: Project owner

## Context

Data must be persisted in a database. This is an exercise application run locally and in CI, so
setup cost matters more than horizontal scale.

## Decision

Use **SQLite** through **EF Core**, a single `app.db` file with WAL enabled, and manage all
schema changes with EF Core migrations.

## Consequences

SQLite's type system forces several concrete modelling choices, all of which are reflected in
the schema:

- No case-insensitive unique index that is portable, so **emails are stored lower-cased** with a
  plain unique index.
- No array column, so **note tags live in a `note_tags` child table** rather than in a column.
- Dates are stored as ISO-8601 text via value converters (`DateOnly` for entry dates,
  `DateTimeOffset` UTC for audit columns), and enums are persisted as strings for readable data
  and stable migrations.
- Integration tests can run against a temp-file database per test class with no external
  service, keeping CI simple and fast.
- Concurrency is limited to a single writer; acceptable for this workload. A move to PostgreSQL
  would mostly be a provider swap plus regenerating migrations, but the choices above would need
  revisiting.

## Alternatives considered

- **PostgreSQL** — native `citext`, arrays, and real concurrency, at the cost of requiring a
  running service locally and in CI.
- **EF Core in-memory provider for tests** — rejected because it does not enforce relational
  constraints, so tests would not catch what production hits.
