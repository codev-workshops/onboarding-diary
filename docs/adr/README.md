# Architecture Decision Records

Each ADR captures one decision, its context, and its consequences. Records are immutable once
accepted: to change a decision, add a new ADR that supersedes the old one and update the old
record's status.

Naming: `ADR-NNN-kebab-title.md`, numbered sequentially. Template: `template.md`.
For the consolidated system view these decisions produce, see [`../architecture.md`](../architecture.md).

| ADR | Title | Status |
|---|---|---|
| [ADR-001](ADR-001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [ADR-002](ADR-002-repository-structure.md) | Repository structure | Accepted |
| [ADR-003](ADR-003-backend-dotnet-minimal-apis.md) | Backend on .NET 10 with ASP.NET Core Minimal APIs | Accepted |
| [ADR-004](ADR-004-frontend-react-vite-router.md) | Frontend on React + TypeScript + Vite + React Router | Accepted |
| [ADR-005](ADR-005-sqlite-with-ef-core.md) | SQLite via EF Core as the datastore | Accepted |
| [ADR-006](ADR-006-jwt-access-token-only-auth.md) | JWT access-token-only authentication | Accepted |
| [ADR-007](ADR-007-trunk-based-development-on-main.md) | Work directly on `main` | Accepted |
| [ADR-008](ADR-008-hard-deletes.md) | Hard deletes instead of a global soft-delete architecture | Accepted |
| [ADR-009](ADR-009-department-as-reference-data.md) | Department as managed reference data | Accepted |
| [ADR-010](ADR-010-incremental-schema-per-milestone.md) | Introduce schema incrementally per milestone | Accepted |
| [ADR-011](ADR-011-no-outbound-email.md) | No outbound email in the MVP | Accepted |
| [ADR-012](ADR-012-api-conventions.md) | HTTP API conventions | Accepted |
| [ADR-013](ADR-013-authorization-model.md) | Role and resource-based authorization model | Accepted |
| [ADR-014](ADR-014-testing-strategy.md) | Testing strategy | Accepted |
