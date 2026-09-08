# ADR-009. Department as managed reference data

- **Status**: Accepted
- **Date**: 2026-09-08
- **Deciders**: Project owner

## Context

The brief lists department as part of a user's profile. Free text would let the same department
be spelled several ways, which breaks the admin dashboard's per-department breakdown and the
department shown on generated reports.

## Decision

Model **`Department(id, name, isActive)`** as reference data referenced by `User.departmentId`.
For the MVP the department list is **seeded**, an admin may **assign a department to a user**,
and `GET /departments` populates pickers on the signup and profile forms. A full Department CRUD
UI is out of scope unless explicitly approved.

## Consequences

- Grouping and filtering by department are reliable, and reports show a canonical name.
- Adding a department outside the seeded set requires a data change until CRUD is approved.
- Departments are deactivated rather than deleted once users reference them, so historical
  records keep resolving.

## Alternatives considered

- **Free-text department field** — zero setup, but produces duplicate spellings and unusable
  aggregates.
- **Full Department CRUD in the MVP** — useful eventually, but not part of the approved scope.
