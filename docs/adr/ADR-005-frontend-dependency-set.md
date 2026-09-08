# ADR-005: Frontend Dependency Set

## Status

Accepted — supersedes the Axios consequence of [ADR-002](ADR-002-frontend-and-backend-stack.md).

## Context

The project owner fixed an exhaustive list of frontend packages for this project. Anything
outside it needs explicit approval before it is installed or referenced. Two packages assumed by
earlier documents — Axios and Playwright — are not on that list, and the list adds ESLint and
Prettier, which the Vite template did not use (it ships oxlint).

## Decision

The approved frontend packages are, and only are:

React, TypeScript, Vite, React Router, Tailwind CSS, TanStack Query, React Hook Form, Zod,
Vitest, React Testing Library, ESLint, Prettier (plus the plugins/typings those require, such as
`@vitejs/plugin-react`, the Tailwind Vite plugin, `jsdom` and `@testing-library/user-event`).

Consequently:

- **HTTP uses the native `fetch` API**, wrapped in one client module under `src/api/` with
  `credentials: 'include'` so the `access_token` cookie ([ADR-004](ADR-004-authentication-strategy.md))
  is sent. TanStack Query still owns server state, caching and invalidation. This supersedes
  ADR-002's "React Query with an Axios HTTP client".
- **Linting and formatting use ESLint and Prettier**, replacing the oxlint configuration that
  came with the Vite template.
- **There is no browser end-to-end framework.** M6 verification is manual against the golden
  paths, backed by Vitest + React Testing Library.

## Alternatives Considered

| Alternative | Why Not Chosen |
|-------------|----------------|
| Keep Axios | Not on the approved list; `fetch` covers JSON requests, credentials and aborts, and one wrapper module gives the same interceptor-style behaviour. |
| Keep oxlint alongside ESLint | Two linters with overlapping rules produce conflicting diagnostics for no benefit. |
| Keep Playwright for M6 | Not on the approved list; the exercise's end-to-end journeys can be verified manually. |

## Consequences

- The `fetch` wrapper must re-implement what Axios gave for free: base URL, JSON serialisation,
  non-2xx → thrown error carrying the `ProblemDetails` body, and the 401 → redirect-to-login
  behaviour. It is a small module, but it is ours to maintain and test.
- Progress events and request/response interceptor chains are not available; nothing in the
  approved requirements needs them.
- Regressions across full user journeys are caught by manual verification rather than by CI.
- Adding any other npm package requires an explanation of the need, the alternatives and the
  impact, plus approval, before installation.
