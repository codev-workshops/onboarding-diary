# ADR-002: Frontend and Backend Stack

## Status

Accepted

## Context

The requirements allow the candidate to choose the tech stack. The stack must support a responsive web UI, a REST API, relational persistence, JWT authentication, and PDF/CSV report generation, while remaining simple and maintainable.

## Decision

- **Frontend:** React with TypeScript, built with Vite.
- **Backend:** .NET 10 with ASP.NET Core Minimal APIs.
- **Persistence:** Entity Framework Core (see ADR-003 for the database choice).

## Alternatives Considered

| Alternative | Why Not Chosen |
|-------------|----------------|
| Next.js (full-stack React) | Adds server-side rendering and routing complexity not needed for this exercise. |
| Angular | Heavier framework with more boilerplate for a small CRUD app. |
| Node.js / Express backend | Would require a different ORM and report-generation ecosystem; .NET provides stronger built-in options for the chosen stack. |
| FastAPI (Python) | Less natural fit for SQLite + EF Core and for the team's likely .NET tooling. |
| ASP.NET Core MVC with Controllers | Adds controller/action abstractions and convention-based routing that are unnecessary for a small CRUD MVP; Minimal APIs keep endpoint definition, validation and handlers colocated and explicit. |

## Consequences

- Fast dev server and hot module replacement on the frontend via Vite.
- Strong typing across the whole stack (TypeScript + C#).
- Minimal APIs reduce boilerplate by colocating route definitions with request/response handlers; route groups keep related endpoints together.
- Mature .NET ecosystem for EF Core, SQLite, JWT and PDF/CSV libraries.
- Need to configure CORS and cookie handling between Vite dev server and ASP.NET Core.
- State management and data fetching use React Query with an Axios HTTP client.
- As the API grows, endpoint modules should be split out of `Program.cs` to maintain readability.
