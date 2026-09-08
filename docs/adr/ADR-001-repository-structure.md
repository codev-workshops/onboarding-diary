# ADR-001: Repository Structure

## Status

Accepted

## Context

The Onboarding Diary is a full-stack web application with a React frontend and an ASP.NET Core backend. We need a repository layout that is simple to build, test and maintain during the exercise, while keeping the frontend and backend clearly separated.

## Decision

Use a **single monorepo** with two top-level folders:

- `backend/` — ASP.NET Core Minimal API solution and tests
- `frontend/` — React + TypeScript + Vite application

Shared documentation lives under `docs/`.

## Alternatives Considered

| Alternative | Why Not Chosen |
|-------------|----------------|
| Separate frontend and backend repositories | Harder to keep in sync for a small greenfield exercise; more CI/setup overhead. |
| Single full-stack framework (e.g., Next.js or Blazor) | Would diverge from the approved stack and mixes concerns. |
| All code in one project root | Blurs the boundary between client and server, complicates build tooling. |

## Consequences

- One clone gets the entire project.
- Each side has independent build, test and dev-server commands.
- CORS is required during local development because frontend and backend run on different ports.
- The root `README.md` must document how to run both sides together.
- Keeps the solution small enough for the exercise without premature splitting into microservices.
