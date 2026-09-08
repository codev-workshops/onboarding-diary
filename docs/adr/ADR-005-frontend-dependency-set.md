# ADR-005: Frontend Dependency Set

## Status

Accepted — supersedes the Axios consequence of [ADR-002](ADR-002-frontend-and-backend-stack.md).

## Context

The project owner fixed an exhaustive list of frontend packages for this project. Anything
outside it needs explicit approval before it is installed or referenced. Axios, assumed by
earlier documents, is not on that list; the list adds ESLint and Prettier, which the Vite
template did not use (it ships oxlint); and Playwright was subsequently approved for a small,
scoped end-to-end suite.

## Decision

The approved frontend packages are, and only are:

React, TypeScript, Vite, React Router, Tailwind CSS, TanStack Query, React Hook Form, Zod,
Vitest, React Testing Library, ESLint, Prettier, Playwright (plus the plugins/typings those
require, such as `@vitejs/plugin-react`, the Tailwind Vite plugin, `jsdom` and
`@testing-library/user-event`).

Consequently:

- **HTTP uses the native `fetch` API**, wrapped in one client module under `src/api/` that
  attaches `Authorization: Bearer <token>` ([ADR-006](ADR-006-bearer-token-transport.md)).
  TanStack Query still owns server state, caching and invalidation. This supersedes
  ADR-002's "React Query with an Axios HTTP client".

  The wrapper stays deliberately small and covers only: the base API URL, JSON
  serialisation/deserialisation, the `Authorization` header, `ProblemDetails` error handling, and
  the 401 → clear-auth-state → redirect-to-login behaviour. It has focused unit tests and must
  not grow into a general HTTP framework (no retry policies, no interceptor chains, no caching —
  caching belongs to TanStack Query).
- **Linting and formatting use ESLint and Prettier**, replacing the oxlint configuration that
  came with the Vite template.
- **Playwright covers business-critical journeys only.** The suite stays small and deliberately
  does not mirror the unit/integration tests:

  | Role | Journey |
  |---|---|
  | Recruit | register/login → create task → dashboard reflects it → create and update an issue → generate a report |
  | Manager | login → open an assigned recruit → confirm read-only (no write controls, writes rejected) |
  | Admin | login → manage a user's role and assignment |
  | Security | recruit cannot reach an admin route; manager cannot reach an unassigned recruit |

## Alternatives Considered

| Alternative | Why Not Chosen |
|-------------|----------------|
| Keep Axios | Not on the approved list; `fetch` covers JSON requests, headers and aborts, and one wrapper module gives the same interceptor-style behaviour. |
| Keep oxlint alongside ESLint | Two linters with overlapping rules produce conflicting diagnostics for no benefit. |
| A broad Playwright suite mirroring every screen | Slow and brittle; unit and integration tests already cover validation, permissions and filters. |

## Consequences

- The `fetch` wrapper must re-implement what Axios gave for free: base URL, JSON serialisation,
  the auth header, non-2xx → thrown error carrying the `ProblemDetails` body, and the 401 →
  redirect-to-login behaviour. It is a small module, but it is ours to maintain and test.
- Progress events and request/response interceptor chains are not available; nothing in the
  approved requirements needs them.
- The end-to-end suite needs a running API and a seeded database, so it runs against a
  throwaway SQLite file with known fixture users — the browsers must be installed in CI
  (`npx playwright install --with-deps`), which lengthens the pipeline.
- Journeys outside the table above are verified manually.
- Adding any other npm package requires an explanation of the need, the alternatives and the
  impact, plus approval, before installation.
