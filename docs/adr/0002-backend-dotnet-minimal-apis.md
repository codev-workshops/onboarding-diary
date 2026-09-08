# 2. Backend on .NET 10 with ASP.NET Core Minimal APIs

- **Status**: Accepted
- **Date**: 2026-09-08
- **Deciders**: Project owner

## Context

The brief leaves the stack to the implementer. The application is a CRUD-heavy diary with four
entry types, role-based access, a dashboard, and report export. The project owner selected .NET
for the backend.

## Decision

Build the API on **.NET 10** using **ASP.NET Core Minimal APIs** with **EF Core**. Endpoints are
grouped per feature (`MapGroup("/api/v1/tasks")`, one static `*Endpoints.cs` class each),
handlers return `TypedResults`, and request validation runs in an endpoint filter that emits RFC
7807 `ProblemDetails`. The SDK version is pinned in `global.json`.

## Consequences

- Little ceremony per endpoint, which suits a project made mostly of thin CRUD slices.
- Grouping conventions must be enforced by review rather than by framework structure, since
  Minimal APIs impose less shape than MVC controllers.
- Cross-cutting concerns (validation, authorization, error mapping) are implemented once as
  filters and policies and applied per group.
- Pinning the SDK avoids tooling drift between local machines and CI.

## Alternatives considered

- **ASP.NET Core MVC controllers** — more conventional structure and built-in model validation,
  at the cost of more boilerplate for simple endpoints.
- **Node/TypeScript or Spring Boot** — rejected by the project owner's stack decision.
