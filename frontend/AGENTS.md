# AGENTS.md — frontend

Web client for Onboarding Diary. See the root `AGENTS.md` for project-wide
context and the Git workflow.

## Stack

- **Next.js** (React, TypeScript)
- **MobX** for global state management

## State management with MobX

- Global application state lives in MobX stores (e.g. `AuthStore`,
  `DiaryStore`). Stores are plain classes using `makeAutoObservable`.
- Components that read observable state are wrapped in `observer`.
- Stores are provided through a single root store via React context; do not
  create ad-hoc singletons in components.
- Keep server-derived data in stores; keep purely local UI state (open/closed,
  hover) in component state.

See `.agents/skills/frontend-mobx-conventions/SKILL.md` for snippets.

## Consuming the backend

### Authentication

- Login is email / password against the backend auth endpoint. The frontend
  sends the plain credentials over HTTPS; hashing is done exclusively by the
  backend.
- The session/token returned by the backend is held in `AuthStore` and attached
  to subsequent API requests by a shared API client. Do not read tokens directly
  in components.
- On a `401` response the API client clears `AuthStore` and redirects to the
  login page.

### REST API (shared layer frozen in S1)

- All backend calls go through `src/lib/apiClient.ts` (`ApiClient`); add one
  typed method per `operationId` in `docs/openapi.yaml`. Components never call
  `fetch` directly.
- Contract types (`UserProfile`, `ErrorResponse`, `ErrorCode` — the full §5.2
  catalog, ...) live in `apiClient.ts`; import them, do not redeclare.
- `ApiError` carries `status`, `code`, `details[]`; `error.toFormErrors()` (or
  `toFormErrors(e)` from `src/lib/formErrors.ts`) yields
  `{ form?, fields: Record<field, message> }` for forms.
- `AuthStore` registers `getToken` / `onUnauthorized` with the client. Any
  `401` on an authenticated call clears the store (memory + `sessionStorage`
  key `onboarding-diary.auth`) and navigates to `/login` via the router
  callback wired in `StoreProvider`. Public calls (`login`, `signup`) never
  trigger that redirect.
- Route guards: wrap page content in `RequireAuth` or
  `RequireRole roles={[...]}` (`src/components/auth/`). They wait for
  `auth.hydrated`, then redirect to `/login?next=` or `/403`. Role-based nav is
  driven by `NAV_ITEMS` in `AppShell.tsx`.
- API responses are written into the relevant MobX store inside an action;
  components react to store changes rather than holding fetched data locally.

### Testing

- Unit tests use Vitest (`npm test`, `src/**/*.test.ts`, node environment).
  Inject a fake `fetch` into `new ApiClient(baseUrl, fetchImpl)` and an
  in-memory storage into `new AuthStore(api, { storage, redirectToLogin })`.

### SSE streams

- Some backend endpoints stream updates via server-sent events
  (`text/event-stream`), e.g. live diary/activity feeds.
- Consume them with `EventSource` (or `fetch` + `ReadableStream` when custom
  headers are required), created inside a store or a dedicated hook, never in
  render.
- Each received event is applied to the store through a MobX action so
  observers re-render. Always close the stream on unmount / logout.
<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
