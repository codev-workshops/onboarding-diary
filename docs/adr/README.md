# Architecture Decision Records

Each ADR captures one decision, its context, and its consequences. Records are immutable once
accepted: to change a decision, add a new ADR that supersedes the old one and update the old
record's status.

Template: `template.md`. Numbering is sequential (`NNNN-title.md`).

| ADR | Title | Status |
|---|---|---|
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [0002](0002-backend-dotnet-minimal-apis.md) | Backend on .NET 10 with ASP.NET Core Minimal APIs | Accepted |
| [0003](0003-frontend-react-vite-router.md) | Frontend on React + TypeScript + Vite + React Router | Accepted |
| [0004](0004-sqlite-with-ef-core.md) | SQLite via EF Core as the datastore | Accepted |
| [0005](0005-jwt-access-token-only-auth.md) | JWT access-token-only authentication | Accepted |
| [0006](0006-trunk-based-development-on-main.md) | Work directly on `main` | Accepted |
| [0007](0007-hard-deletes.md) | Hard deletes instead of a global soft-delete architecture | Accepted |
| [0008](0008-department-as-reference-data.md) | Department as managed reference data | Accepted |
| [0009](0009-incremental-schema-per-milestone.md) | Introduce schema incrementally per milestone | Accepted |
| [0010](0010-no-outbound-email.md) | No outbound email in the MVP | Accepted |
