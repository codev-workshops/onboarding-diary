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

- Login is username / password against the backend auth endpoint. The frontend
  sends the plain credentials over HTTPS; hashing is done exclusively by the
  backend.
- The session/token returned by the backend is held in `AuthStore` and attached
  to subsequent API requests by a shared API client. Do not read tokens directly
  in components.
- On a `401` response the API client clears `AuthStore` and redirects to the
  login page.

### REST API

- All backend calls go through a single typed API client module; components
  never call `fetch` directly.
- API responses are written into the relevant MobX store inside an action;
  components react to store changes rather than holding fetched data locally.

### SSE streams

- Some backend endpoints stream updates via server-sent events
  (`text/event-stream`), e.g. live diary/activity feeds.
- Consume them with `EventSource` (or `fetch` + `ReadableStream` when custom
  headers are required), created inside a store or a dedicated hook, never in
  render.
- Each received event is applied to the store through a MobX action so
  observers re-render. Always close the stream on unmount / logout.
