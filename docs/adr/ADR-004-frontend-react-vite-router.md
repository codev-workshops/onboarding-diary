# ADR-004. Frontend on React + TypeScript + Vite + React Router

- **Status**: Accepted
- **Date**: 2026-09-08
- **Deciders**: Project owner

## Context

The application needs a responsive, role-aware SPA: recruits author entries, managers get
read-only views of assigned recruits, and admins manage users. Screens are list-and-form heavy
with shared filtering patterns.

## Decision

Use **React + TypeScript**, built with **Vite**, routed with **React Router**'s data router.
Route-level guards derive the current role from the auth context. Server state is handled by a
query cache with invalidation after mutations; forms use a schema validator mirroring the
server's validation rules. Styling is utility-first CSS.

## Consequences

- Fast dev server and simple build pipeline; the Vite dev proxy forwards `/api` to the backend,
  keeping local development same-origin.
- Role guards live in the router, so an unauthorised screen is never rendered, but the server
  remains the authority: every endpoint re-checks permissions.
- TypeScript types for API DTOs are maintained by hand and must be kept in step with the backend
  contract.

## Alternatives considered

- **Next.js** — server rendering and routing conventions are unnecessary for an authenticated
  internal tool and would add a Node hosting requirement alongside the .NET API.
- **Blazor** — would unify the language with the backend, but the project owner selected React.
