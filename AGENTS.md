# AGENTS.md

Working instructions for AI agents (Devin and similar) contributing to Onboarding Diary. Human
contributors should read this too — it is the short version of the conventions that
[`docs/architecture.md`](docs/architecture.md) and [`docs/adr/`](docs/adr/README.md) justify.

Read before starting any task:
1. [`docs/requirements.md`](docs/requirements.md) — what the product must do.
2. [`docs/implementation-plan.md`](docs/implementation-plan.md) — which milestone the task belongs to.
3. [`docs/architecture.md`](docs/architecture.md) — how the system fits together.
4. The [ADRs](docs/adr/README.md) — only four are recorded (repository structure, stack,
   database, authentication); every other binding decision lives in the plan and architecture
   documents.

---

## 1. Non-negotiable rules

These come from decisions locked by the project owner. Do not "improve" past them; if a task
seems to require breaking one, stop and ask.

- **Commit to `main`.** No `devin/*` branches, no pull requests unless explicitly requested.
- **Do not implement anything that is not in the approved requirements.** No speculative
  features, no extra endpoints, no "while I was here" refactors.
- **Do not introduce new architectural patterns, abstractions or implementation strategies
  without explicit approval.** Follow the existing architecture, conventions and accepted ADRs.
  No Strategy pattern, CQRS, MediatR-style dispatch, repository or unit-of-work wrappers over
  `DbContext`, factories, or other structural layers unless the approved design requires them.
- **Do not add dependencies without explicit approval** — no new npm packages, no new NuGet
  packages. Prefer the framework, the standard library and already-approved dependencies. If one
  is genuinely required, stop and explain why it is needed, what problem it solves, the
  alternatives considered and the impact of adding it; wait for approval before installing or
  referencing it. The approved list is §2.1; anything outside it needs approval.
- **Authentication is a JWT sent as `Authorization: Bearer <token>`**
  ([ADR-006](docs/adr/ADR-006-bearer-token-transport.md), superseding ADR-004): login returns the
  token in the response body, expiry is 60 minutes, logout discards it on the client. Never add
  authentication cookies, CORS `AllowCredentials`, CSRF middleware, refresh tokens, rotation,
  reuse detection or revocation lists. Never put the token in `localStorage` — auth state, and
  `sessionStorage` only where a refresh must survive.
- **No outbound email**, no mailer abstraction, no password-reset flow.
- **Deletes are hard deletes.** Never introduce `deleted_at` columns or global query filters.
- **Departments are seeded reference data.** No Department CRUD UI.
- **Schema grows per milestone.** Do not create tables for features you are not implementing in
  this task.
- **Never commit secrets.** The JWT signing key and the seeded admin credentials come from
  configuration or environment variables; `onboardingdiary.db`, `.env` and build output are
  gitignored — keep them that way.
- **Do not edit an accepted ADR** to change a decision. Add a new ADR that supersedes it and
  update the old record's status.

---

## 2. Environment

| Tool | Version | Notes |
|---|---|---|
| .NET SDK | 10.0.400 | pinned in `global.json`; install with `dotnet-install.sh --channel 10.0` if absent |
| Node.js | 24 | `nvm use 24` |

The solution uses the SDK 10 XML solution format: it is `backend/OnboardingDiary.slnx`, **not**
`.sln`. Use the `.slnx` path in every `dotnet` command.

### 2.1 Approved dependencies

These are approved; add them to the project when the milestone that needs them arrives. Anything
**not** on this list requires approval before it is installed or referenced.

Already referenced: `Microsoft.NET.Sdk.Web`, the xUnit test template packages, `react`,
`react-dom`, `vite`, `@vitejs/plugin-react`, `typescript`.

**Backend**

| Purpose | Package | Arrives |
|---|---|---|
| ORM + provider | `Microsoft.EntityFrameworkCore.Sqlite`, `.Design` (+ `dotnet-ef` tool) | M0 |
| Authentication | `Microsoft.AspNetCore.Authentication.JwtBearer` | M1 |
| Integration tests | `Microsoft.AspNetCore.Mvc.Testing` | M0 |
| Assertions | none — built-in xUnit `Assert.*` only; Shouldly and FluentAssertions are **not** to be added | — |
| Validation | `FluentValidation.AspNetCore` | M1 |
| Reports | `QuestPDF` (PDF), `CsvHelper` (CSV) | M5 |

**Frontend** — this list is exhaustive; no other npm package may be installed without approval.

| Purpose | Package | Arrives |
|---|---|---|
| UI | `react`, `react-dom` | present |
| Language | `typescript` | present |
| Build | `vite`, `@vitejs/plugin-react` | present |
| Routing | `react-router-dom` | M0 |
| Styling | `tailwindcss` (+ its Vite plugin) | M0 |
| Server state | `@tanstack/react-query` | M1 |
| Forms | `react-hook-form`, `zod` | M1 |
| Tests | `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom` | M0 |
| Lint / format | `eslint` (+ the TypeScript/React configs it needs), `prettier` | M0 |
| E2E | `@playwright/test` | M6 |

Consequences of that list being exhaustive:

- **No HTTP client library.** Axios is *not* approved, so the single client in `src/api/` wraps
  the native `fetch` (attaching the `Authorization` header). This supersedes the
  Axios mention in [ADR-002](docs/adr/ADR-002-frontend-and-backend-stack.md); TanStack Query
  still owns server state.
- **Playwright is scoped to business-critical journeys only** (§6) — do not grow it into a
  screen-by-screen suite.
- **ESLint + Prettier replace oxlint** — `npm run lint` and the CI lint step use ESLint;
  `npm run format` / `--check` uses Prettier.

Styling rules: Tailwind utility classes with small reusable React components; keep layouts
responsive and consistent. No other UI framework (Material UI, Bootstrap, Chakra, Ant Design,
…) and no additional Tailwind plugins without approval.

If a capability cannot be built reasonably from these packages or browser/platform APIs, stop
and explain the need, the proposed package, the alternatives and the impact — then wait for
approval.

## 3. Commands

```bash
# backend
cd backend
dotnet build OnboardingDiary.slnx
dotnet test  OnboardingDiary.slnx
dotnet run --project src/OnboardingDiary.Api          # http://localhost:5276

# frontend
cd frontend
npm ci
npm run lint          # eslint
npm run format        # prettier --write  (`--check` in CI)
npm run build         # tsc -b && vite build
npm run dev           # http://localhost:5173
npm run test          # vitest (from M0)
npm run test:e2e      # playwright (from M6; needs the API running)

# migrations (from backend/)
dotnet ef migrations add <Name> --project src/OnboardingDiary.Api
dotnet ef database update --project src/OnboardingDiary.Api
```

**Before every commit**: backend build + test, frontend lint + build. CI runs exactly these on
every push to `main` and is the only automated gate.

---

## 4. Where code goes

Backend is organised by feature, not by layer ([ADR-001](docs/adr/ADR-001-repository-structure.md)).
Adding a vertical slice means touching, for one feature:

| Path | What belongs there |
|---|---|
| `src/OnboardingDiary.Api/Endpoints/<Feature>Endpoints.cs` | route group + `TypedResults` handlers |
| `src/OnboardingDiary.Api/Features/<Feature>/` | request/response DTOs, validators, handler service |
| `src/OnboardingDiary.Api/Domain/` | entity + enums, **no EF Core attributes** |
| `src/OnboardingDiary.Api/Infrastructure/Configurations/` | `IEntityTypeConfiguration<T>` mapping |
| `src/OnboardingDiary.Api/Infrastructure/Migrations/` | one migration per schema-changing milestone |
| `src/OnboardingDiary.Api/Common/` | only genuinely cross-cutting code |
| `tests/OnboardingDiary.UnitTests/` | validators, state machines, permission rules |
| `tests/OnboardingDiary.IntegrationTests/` | endpoint tests per role |

Frontend mirrors the backend feature names in `frontend/src/features/<feature>/`. Anything used
by two or more features moves to `frontend/src/components/`. API types and the `fetch` client
live in `frontend/src/api/`; auth context and guards in `frontend/src/auth/`.

---

## 5. Backend conventions

- Minimal APIs grouped with `MapGroup("/api/v1/<resource>").RequireAuthorization()`, one static
  `*Endpoints.cs` class per feature, handlers returning `TypedResults`.
- **Every failure returns RFC 7807 `ProblemDetails`**; validation failures go through the shared
  endpoint filter as `ValidationProblem`.
- **Every list endpoint is paged**: `page`, `page_size` (default 20, max 100), `sort`, returning
  `{ items, page, page_size, total }`. Reuse the shared paging binder and response type.
- Shared filter parameter names: `from`, `to`, `q`, `user_id`.
- JSON is camelCase; dates ISO-8601; enums serialised as their string names.
- Status codes: 201 + `Location` on create, 204 on delete, 403 when authenticated but not
  permitted, **404 for resources outside the caller's scope** (do not leak existence), 409 on
  conflict.
- Auth wiring: `AddJwtBearer` validates the `Authorization: Bearer` token; CORS names an explicit
  origin, never `*`, and does not allow credentials; passwords use `PasswordHasher<User>`
  (Identity shared framework, no Identity UI or tables).
- **Authorization is mandatory on every endpoint**: a claim policy (`AdminOnly`,
  `RecruitOnly`, `ManagerOrAdmin`) plus `EntryAccessHandler` for the relationship check whenever
  entry data is involved. Managers and admins never write entry data. Frontend guards are never
  a substitute.
- `Domain/` stays persistence-agnostic; mapping lives in `Infrastructure/Configurations/`.
- SQLite constraints to respect ([ADR-003](docs/adr/ADR-003-database-choice.md)): the database
  file is `onboardingdiary.db`; store emails lower-cased with a plain unique index,
  no array columns (tags live in `note_tags`), dates as ISO-8601 text via value converters.

## 6. Frontend conventions

- Data fetching is **TanStack Query over one `fetch` wrapper**
  ([ADR-005](docs/adr/ADR-005-frontend-dependency-set.md)). The wrapper lives in `src/api/`,
  attaches `Authorization: Bearer <token>`, serialises JSON, and throws a typed error carrying the
  `ProblemDetails` body; components never call `fetch` directly and no HTTP client library is
  added. Keep the wrapper minimal — base URL, JSON, auth header, `ProblemDetails`, error
  handling, nothing more (no retries, no interceptor chains, no caching; caching is TanStack
  Query's job) — and cover it with focused unit tests.
- **Auth context owns the token** (in memory, mirrored to `sessionStorage`) plus the profile from
  `GET /me`; a 401 from the wrapper clears both and redirects to login preserving the attempted
  route.
- Server state goes through the TanStack Query cache with explicit invalidation after mutations;
  no global client store.
- Forms use schema validation mirroring the server rules — the server stays authoritative.
- Every list screen needs loading, empty and error states, plus the shared filter bar; tables on
  desktop, cards on mobile.
- Accessibility is part of "done": keyboard-navigable forms and modals, labelled inputs,
  contrast ≥ 4.5:1, status and severity conveyed by text as well as colour.
- **Playwright (from M6) covers only these journeys** — adding more needs approval:

  | Role | Journey |
  |---|---|
  | Recruit | register/login → create task → dashboard reflects it → create and update an issue → generate a report |
  | Manager | login → open an assigned recruit → confirm read-only |
  | Admin | login → manage a user's role and assignment |
  | Security | recruit blocked from an admin route; manager blocked from an unassigned recruit |

---

## 7. Definition of done for a task

1. Code follows the placement and conventions above.
2. Unit tests for validators, state transitions and permission rules; integration tests for each
   new endpoint covering the happy path, a validation failure, and **each role**
   (`recruit-own`, `recruit-other`, `assigned-manager`, `unassigned-manager`, `admin`,
   `anonymous`).
3. Backend build + test and frontend lint + build all pass locally.
4. Documentation updated when behaviour or structure changed: `docs/requirements.md` for scope,
   `docs/architecture.md` for structure and conventions, a new ADR only for a genuinely
   architectural decision, `README.md` if commands or layout changed.
5. Committed to `main` with a Conventional Commit message (`feat:`, `fix:`, `docs:`, `chore:`,
   `test:`, `refactor:`), scoped to one logical change.

## 8. When to stop and ask

- The task appears to require breaking a rule in §1.
- Requirements and an ADR contradict each other (the ADRs and the implementation plan are the
  more recent source of truth — flag the mismatch rather than guessing).
- A decision you need is not recorded anywhere: only repository structure, stack and database
  have ADRs; the rest is in `docs/architecture.md` and `docs/implementation-plan.md`.
- A change would alter the API contract that existing frontend code depends on.
- A new third-party dependency is needed.
- CI fails for a reason unrelated to your change, or fails three times in a row.

## 9. Known open items

- `docs/requirements.md` is still at v0.2 and describes anonymous feedback, admin temporary
  passwords, and soft deletes. All three were removed by the locked decisions; the implementation
  plan wins. Alignment of that document is pending owner approval.
- The .NET assertion library and the frontend styling approach are not decided yet (see the
  follow-ups in the implementation plan).
- The repository has no remote yet; it will live at `codev-workshops/onboarding-diary`.
