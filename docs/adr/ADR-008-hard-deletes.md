# ADR-008. Hard deletes instead of a global soft-delete architecture

- **Status**: Accepted
- **Date**: 2026-09-08
- **Deciders**: Project owner

## Context

An earlier draft proposed `deleted_at` columns on every entry table with EF Core global query
filters, so that deleted rows were hidden from lists, dashboards, and reports. No approved
requirement asks for recovery of deleted entries or an audit trail, and the project owner
directed that a global soft-delete architecture not be introduced.

## Decision

Deleting an entry **removes the row**. No `deleted_at` columns and no global query filters. The
UI requires an explicit confirmation before a destructive action, and only the owning recruit
can delete their own entries.

## Consequences

- Queries, aggregates, and report totals read directly from the tables with no filter that could
  be forgotten on a new query path — a common source of soft-delete bugs.
- Deletions are irreversible; there is no undo and no recycle bin.
- If recovery or audit history is required later, it arrives as a new ADR and a migration, most
  likely as an append-only audit table rather than a resurrected soft-delete flag.

## Alternatives considered

- **Global soft delete** — enables undo and audit, but adds a filter obligation to every query
  and was judged unnecessary for the approved scope.
