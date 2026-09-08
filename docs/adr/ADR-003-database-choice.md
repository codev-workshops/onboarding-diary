# ADR-003: Database Choice

## Status

Accepted

## Context

The application must persist data in a database. The exercise should be self-contained and easy to run locally without installing external servers.

## Decision

Use **Entity Framework Core with SQLite**.

- EF Core handles migrations, relationships and LINQ queries.
- SQLite stores data in a single file (`onboardingdiary.db`), requiring no separate database server.

## Alternatives Considered

| Alternative | Why Not Chosen |
|-------------|----------------|
| PostgreSQL or SQL Server | Requires installing and configuring a database server; adds infrastructure overhead for an exercise. |
| EF Core In-Memory provider | Does not provide real persistence across restarts. |
| NoSQL (e.g., MongoDB) | Less natural for the relational user-entry-report model and aggregation queries. |
| Dapper + SQLite | Would require writing more SQL and migration scripts by hand; EF Core is sufficient for the exercise. |

## Consequences

- Zero external dependencies; the app runs after `dotnet ef database update`.
- Migrations and schema changes are managed through EF Core.
- SQLite is file-based and suitable for single-user/small-team local development.
- Production would require a server database (e.g., PostgreSQL), but that is out of scope for the exercise.
- Concurrency and connection handling are simpler in the in-process SQLite model.
