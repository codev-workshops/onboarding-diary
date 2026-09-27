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
  driven by the nav-item registry (see below), not by editing `AppShell.tsx`.
- API responses are written into the relevant MobX store inside an action;
  components react to store changes rather than holding fetched data locally.

## Additive extension points (frozen in S3 — append, never refactor)

Slices S4/S5/S6 (questions, issues, reflections, ...) are built in parallel.
Every shared touch point is a registry you **append one line to**; do not edit
shared components, stores or the client class. Copy the S3 task slice
(`src/features/tasks/`, `src/lib/api/tasks.ts`, `src/stores/TaskStore.ts`,
`src/app/tasks/`) as the reference.

| Touch point | Where to append (one line per slice) | What the line imports |
|-------------|--------------------------------------|-----------------------|
| API resource | `src/lib/apiClient.ts`: `export * from "@/lib/api/<res>";` **and** `readonly <res> = new <Res>Api(this);` | `src/lib/api/<res>.ts` — types + a class implementing `EntryApi<T, C, U, Q>` over the `ApiTransport` |
| Store | `src/stores/RootStore.ts`: `this.<res> = this.register(new <Res>Store(api));` (+ the `readonly` field) | `src/stores/<Res>Store.ts` extending `EntryStore<T, C, U, F, Q>` |
| Nav item | `src/lib/registry/index.ts`: `registerNavItems(<RES>_NAV_ITEM);` | `src/features/<res>/registry.tsx` |
| `/recruits/{id}` tab | `src/lib/registry/index.ts`: `registerRecruitTabs(<RES>_RECRUIT_TAB);` | same file; the tab component receives `{ recruitId }` |

Rules:

- `EntryStore<T>` (`src/stores/EntryStore.ts`) owns list/filters/page/sort/
  `recruitId`, `current`, optimistic create/update/remove and `clear()`.
  Subclasses only implement `filterQuery(filters)` (slice enums → query) and
  optionally `errorMessage(e)` and `matchesFilters(entry, filters)` (so an
  optimistic create is only inserted when it belongs in the loaded list; the
  base checks the date range). Views must render `store.currentList`, not
  `store.list`: it is `null` until a page loaded for the *current*
  filters/page/sort/recruit exists, so stale pages never flash or leak into
  the URL. Optimistic patches only apply when the entry still matches the
  filters and the default sort keeps its position; otherwise the list is
  dropped and reloaded. `update(id, body, ifMatch?)` forwards the entry's
  ETag (`"<version>"`) so a stale edit fails with 409 `CONFLICT` instead of
  overwriting. Do not add slice fields to `EntryStore`.
- `RootStore.register(store)` enrols the store in the per-user reset; anything
  registered is cleared on login/logout. Stores must expose `clear()`.
- Generic UI lives in `src/components/entries/` (`FilterBar`, `EntryList`,
  `EntryForm`, `ConfirmDialog`) and `src/hooks/useUrlFilters.ts`. Configure
  them with field definitions; do not fork them. If a slice genuinely needs a
  new capability, add an optional prop with a default that keeps S3 behaviour.
- `useUrlFilters` maps filter keys 1:1 to query keys, `page` is 1-based in
  the URL / 0-based in the store, default values are omitted, and unmanaged
  keys (e.g. `?tab=`) are preserved — so several tabs can share one URL.
- Registries ignore duplicate `href` / `id`, sort by `order` and filter by
  `roles`; pick an `order` in your slice's hundreds (S3 = 100, S4 = 200, ...).
- Nav items for recruit-owned entries are recruit-only; managers/admins reach
  the same data read-only through the recruit tab.

See `.agents/skills/frontend-entry-slice/SKILL.md` for a copy-paste checklist.

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
