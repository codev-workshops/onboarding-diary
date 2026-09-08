# Onboarding Diary — Implementation Plan

Version 0.6 — reconciled with what is actually in the repository (§0) and with every decision
locked since v0.3: bearer-token authentication (ADR-006, superseding ADR-004), built-in xUnit
assertions, and the
approved dependency sets — Tailwind, TanStack Query over native `fetch`, ESLint + Prettier, no
Axios, and a scoped Playwright suite from M6 (ADR-005). Companion to
[requirements.md](requirements.md),
[architecture.md](architecture.md) and the [ADRs](adr/README.md). M0 and M1 are implemented; M2 is
next.

Stack (unchanged): **.NET 10 / ASP.NET Core Minimal APIs / EF Core / SQLite** backend,
**React + TypeScript + Vite + React Router + Tailwind** frontend, **JWT sent as
`Authorization: Bearer`** (ADR-006).

### Locked constraints applied in this revision
1. **Work directly on `main`** — no `devin/*` branches, no milestone PRs unless later requested.
2. **Access tokens only** — no refresh tokens, no refresh-token storage, no rotation, no reuse
   detection, no token-family revocation. Per ADR-006 the token is returned in the login response
   body, sent back as `Authorization: Bearer`, and discarded client-side on logout — no
   authentication cookies, no credentialed CORS, no CSRF middleware.
3. **M0 schema is thin** — only `User` and `Department`. Each entry table arrives with the
   milestone that implements its slice.
4. **Removed**: anonymous feedback, password reset / admin temporary passwords, and anything
   else not in the approved requirements.
5. **Department** stays managed reference data (`Department(id, name, isActive)`): seeded, admin
   can assign it to users; no Department CRUD UI.
6. **No global soft-delete architecture** — deletes are hard deletes unless a specific approved
   requirement says otherwise.
7. New milestone order (§3).
8. Stack retained as listed above.
9. **No new architectural patterns or abstractions without approval** — no CQRS, MediatR-style
   dispatch, repository/unit-of-work wrappers over `DbContext`, or factories. Handlers talk to
   `AppDbContext` directly.
10. **No dependency outside the approved list** (§2.1 of [`../AGENTS.md`](../AGENTS.md),
    frontend set fixed by [ADR-005](adr/ADR-005-frontend-dependency-set.md)) without approval.
    Assertions are built-in xUnit `Assert.*`; styling is Tailwind CSS with no other UI framework
    and no extra Tailwind plugins; HTTP is native `fetch`, not Axios; linting is ESLint +
    Prettier, not oxlint; Playwright is limited to the business-critical journeys listed in M6.

---

## 0. Current State (audit as of the M0 completion commits)

What exists on `main` today, checked against this plan:

| Area | Planned for M0 | Actual | Status |
|---|---|---|---|
| Monorepo scaffold | `backend/` + `frontend/` + root tooling | present | done |
| Solution file | `OnboardingDiary.sln` | `OnboardingDiary.slnx` (SDK 10 XML format) | done — plan corrected below |
| Backend project | API project with feature folders | present, folders held by `.gitkeep` | done |
| `Program.cs` | host with DI, EF Core, CORS, `/healthz` | EF Core + SQLite at `backend/data/onboardingdiary.db`, explicit-origin CORS, `/healthz`, OpenAPI in development, migrate + seed on development startup | done — auth wiring belongs to M1 |
| EF Core + SQLite | `AppDbContext`, `User`, `Department`, initial migration, seed | all present; `InitialCreate` creates only `Users` and `Departments`; idempotent departments-only seed | done |
| Test projects | xUnit unit + integration, `WebApplicationFactory` fixture | `ApiFactory` on a temp-file SQLite database, health + seed integration tests, seeder idempotency unit test | done |
| Frontend app | Vite React/TS app | present (React 19, Vite 8, TypeScript 6) | done |
| Frontend shell | layout, nav, router skeleton, Tailwind, placeholder pages | Tailwind v4 via `@tailwindcss/vite`, React Router data router, responsive sidebar/topbar layout, six placeholder routes, `/api` dev proxy to `:5276` | done |
| Frontend tests | Vitest + RTL with a smoke test | Vitest + RTL + jsdom, `src/test/setup.ts`, layout smoke test | done |
| Lint | ESLint + Prettier | `eslint.config.js` + `.prettierrc.json`; oxlint removed | done |
| CI | build + test both sides | backend restore/build/test; frontend `npm ci`, lint, `format:check`, test, build | done |
| Tooling pins | `global.json`, Node version in CI | SDK 10.0.400 pinned, Node 24 in CI | done |
| Docs | not in the original plan | `docs/requirements.md`, `docs/implementation-plan.md`, `docs/architecture.md`, six ADRs (structure, stack, database, authentication, frontend dependency set, bearer token transport), root `AGENTS.md` | done, added since |
| Remote | `codev-workshops/onboarding-diary` | local repo only, no remote configured | **blocked on you** |

So **M0 is complete**: scaffold, data layer, health endpoint, test infrastructure, tooling, the
application shell, CI and documentation are all in place. Users are deliberately not seeded and
no authentication exists yet — both belong to M1.

The environment itself is not reproducible yet: the .NET 10 SDK is absent from the VM snapshot
and was installed ad hoc into `~/.dotnet`. That belongs in the environment blueprint before the
next session.

---

## 1. Repository Layout

Single repo, work committed straight to `main`.

```
onboarding-diary/
├─ .github/workflows/ci.yml          # build + test both sides on every push to main
├─ .editorconfig  .gitignore  global.json  README.md  AGENTS.md
├─ docs/                             # requirements, this plan, architecture.md, adr/
├─ backend/
│  ├─ OnboardingDiary.slnx           # SDK 10 XML solution format — not .sln
│  ├─ src/OnboardingDiary.Api/
│  │  ├─ Program.cs                  # host, DI, JWT auth, CORS, rate limiter, endpoint mapping
│  │  ├─ Endpoints/                  # one static class per feature, added per milestone
│  │  ├─ Features/<Feature>/         # request/response DTOs, validators, handler services
│  │  ├─ Domain/                     # entities + enums
│  │  ├─ Infrastructure/
│  │  │  ├─ AppDbContext.cs, Configurations/, Migrations/, Seed/
│  │  │  ├─ Auth/ (JwtTokenService, PasswordHasher)
│  │  │  └─ Reporting/ (added in M5)
│  │  └─ Common/                     # ProblemDetails helpers, paging, auth policies/handlers
│  └─ tests/
│     ├─ OnboardingDiary.UnitTests/
│     └─ OnboardingDiary.IntegrationTests/   # WebApplicationFactory + temp-file SQLite
└─ frontend/
   ├─ index.html  vite.config.ts  tsconfig*.json  eslint.config.js  .prettierrc
   └─ src/
      ├─ main.tsx  router.tsx        # React Router data router + role guards
      ├─ api/                        # fetch wrapper, DTO types, TanStack Query hooks
      ├─ auth/                       # AuthProvider (profile from GET /me), RequireRole
      ├─ features/{tasks,issues,feedback,notes,dashboard,reports,team,admin}/
      ├─ components/                 # DataTable, FilterBar, Modal, DateRangePicker, StatCard…
      └─ test/                       # Vitest + React Testing Library setup
```

Conventions: nullable reference types on, warnings-as-errors in CI, `dotnet format`, **ESLint +
Prettier** on the frontend (replacing the template's oxlint), Conventional Commits, small commits
pushed to `main` per milestone.

---

## 2. Cross-Cutting Design

**Endpoint style** — Minimal APIs grouped with
`MapGroup("/api/v1/tasks").RequireAuthorization()`, one static `*Endpoints.cs` per feature,
handlers returning `TypedResults`. A validation endpoint filter converts failures into
`ValidationProblem` (RFC 7807 `ProblemDetails`).

**Authentication** (ADR-006) — email + password login returns a **JWT in the response body**,
which the SPA sends back as `Authorization: Bearer <token>`: 60-minute expiry, claims for user
id, email and role, validated by `AddJwtBearer`. **Logout is client-side** (the SPA discards the
token); there is no token store and no revocation list. Passwords hashed with
`PasswordHasher<User>` from the Identity shared framework (no Identity UI or tables). The initial
admin is seeded from environment variables at startup. Login is rate-limited (5 attempts / 15 min
/ IP). Expired token → 401 → client redirects to login. CORS names the explicit Vite dev origin
and does **not** allow credentials.

**Authorization** — claim-based policies `AdminOnly`, `RecruitOnly`, `ManagerOrAdmin`, plus a
resource handler `EntryAccessHandler` resolving *owner* (read+write), *assigned manager*
(read-only), *admin* (read-only). Manager/admin write attempts → 403; requests scoped to a
non-assigned recruit → 404 (no existence leak).

**Deletes** — hard delete (`DELETE` removes the row) with a confirmation dialog in the UI. No
`deleted_at` columns and no global query filters.

**Paging & filtering** — shared `PagedRequest` binder (`page`, `page_size` ≤ 100, `sort`) and
`PagedResponse<T>`; per-feature `IQueryable` filter extensions.

**SQLite specifics** — emails stored lower-cased with a unique index (no portable
case-insensitive index); `DateOnly` entry dates and UTC `DateTimeOffset` audit columns via value
converters storing ISO-8601 text; enums persisted as strings; note tags in a `note_tags` child
table (no array type). `Data Source=onboardingdiary.db` (ADR-003), WAL enabled.

**Migrations** — one EF Core migration per milestone that changes the schema, so the schema grows
with the feature slices rather than up front.

**Errors & logging** — all failures return `ProblemDetails`; global exception handler maps
unhandled exceptions to 500 with a correlation id; structured logging with request id;
`/healthz`.

**Frontend data flow** — a single **`fetch` wrapper** in `src/api/` that attaches
`Authorization: Bearer <token>` from the auth context, JSON serialisation, and a typed error
carrying the `ProblemDetails` body; 401 clears auth state and redirects to login. **TanStack
Query** owns server state and cache invalidation; React Router data router with role guards from
the auth context; React Hook Form + Zod schemas mirroring server validation. No HTTP client
library — see [ADR-005](adr/ADR-005-frontend-dependency-set.md). The wrapper stays minimal (base
URL, JSON, the auth header, `ProblemDetails`, error handling — no retries, interceptors or
caching) and ships with focused unit tests.

**Styling** — Tailwind CSS utility classes composed into small reusable React components in
`src/components/`; no other UI framework and no extra Tailwind plugins. Responsive from the
start: mobile-first utilities, with the dedicated responsive/accessibility pass in M6.

---

## 3. Milestones

Order per the locked list. Each milestone is a set of commits on `main`, with CI green before
the next begins.

### M0 — Foundation
- Monorepo scaffold: solution, API project, unit + integration test projects, Vite React/TS app,
  shared tooling config, `global.json` pinning the .NET SDK.
- EF Core + SQLite wiring; `AppDbContext` containing **only `User` and `Department`**; initial
  migration; seed of initial departments and demo users (1 admin, 1 manager, 2 recruits).
- `/healthz`; Swagger/OpenAPI in development; CORS + Vite dev proxy for `/api`.
- Test infrastructure: xUnit with built-in `Assert.*`, a `WebApplicationFactory` fixture with a
  temp-file SQLite database; Vitest + RTL setup with one smoke test each, replacing the template
  `UnitTest1.cs` files.
- Replace oxlint with **ESLint + Prettier** (`npm run lint`, `npm run format`).
- `ci.yml`: backend restore/build/test and frontend `npm ci` / `npm run lint` / `npm run build`
  are already wired; add `npm run test` in the same commit that introduces Vitest, and a
  `prettier --check` step with the formatter.
- Frontend application shell: remove the Vite demo page and assets, then add Tailwind, layout,
  sidebar/topbar navigation, React Router skeleton, placeholder pages.
- **Done when** both apps run locally, `/healthz` responds, CI green on `main`.
- **Remaining** per §0: everything in this milestone except the scaffold, tooling pins, lint and
  the existing CI jobs.

### M1 — Authentication + Profile
- Endpoints (implemented under `/api/v1`): `POST /auth/signup`, `POST /auth/login`,
  `POST /auth/change-password`, `GET /me`, `PATCH /me`, `GET /departments` (list for pickers).
  There is no logout endpoint: logout is client-side under ADR-006.
- Password hashing, JWT issuing and `AddJwtBearer` validation, seeded admin from environment
  variables, auth rate limiting, policies and `EntryAccessHandler` (consumed from M2).
- Frontend: login and signup pages (department dropdown from `GET /departments`), auth context
  holding the token (memory + `sessionStorage`) and the `GET /me` profile, the `fetch` wrapper
  attaching the `Authorization` header, protected routes, profile page, client-side logout.
- **Tests**: signup validation, duplicate email 409, login failure messaging, rate limit, login
  returns a token, missing/expired/invalid token → 401, wrapper attaches the header and clears
  state on 401, role-guard matrix.

### M2 — Task Log + basic Dashboard
- Schema: `TaskEntry` (+ migration).
- Endpoints: task CRUD and list with filters (`from`, `to`, `category`, `status`, `priority`,
  `q`, paging, sort); ownership enforced.
- `GET /dashboard` — **basic version**: recruit task counts (total / open / done), completion
  percentage, and recent task activity.
- Frontend: task list (table desktop / cards mobile), filter bar, create-edit modal, detail
  drawer, delete confirmation, one-click status change, dashboard stat cards; loading, empty and
  error states.
- **Tests**: validation rules, ownership enforcement, filter/paging correctness, dashboard
  aggregate correctness, UI form tests.

### M3 — Issues + Feedback + Notes
- Schema: `IssueEntry`, `FeedbackEntry`, `NoteEntry`, `NoteTag` (+ migration).
- Issues: CRUD, severity/status filters, status-transition state machine, resolution notes
  required on `RESOLVED`/`CLOSED`, automatic `resolved_at`.
- Feedback: CRUD, type filter. **No anonymous option** — feedback is always attributed.
- Notes: CRUD, tags child table, tag filter, content search.
- Dashboard extended with open issues by severity, feedback/notes counts, and a combined recent
  activity feed.
- Frontend: three list screens reusing the M2 components; resolve-issue dialog; tag chips.
- **Tests**: transition matrix, resolution-notes enforcement, tag normalisation/de-duplication,
  filter correctness.

### M4 — Manager + Admin
- Manager: `GET /dashboard` roster view (per-recruit completion %, open issues, last activity)
  and read-only access to an assigned recruit's four entry lists via `user_id` scoping.
- Admin: `GET /admin/users` (filters), `POST /admin/users` (role, department, initial password
  set by the admin at creation), `PATCH /admin/users/{id}` (role, `department_id`, `manager_id`,
  `is_active`), `GET /admin/stats`. **No password reset endpoint, no temporary passwords, no
  Department CRUD UI** — departments remain seeded reference data assignable to users.
- Frontend: Team roster → read-only recruit diary (no write controls rendered); Admin users
  table with create/edit drawer including a department selector.
- **Tests**: manager write attempts 403, unassigned recruit 404, manager-cycle rejection,
  inactive-user login rejection, admin scope.

### M5 — Reports
- `GET /reports/preview` (JSON) and `GET /reports/download` (`format=pdf|csv`), with
  `user_id`, `from`, `to`, `sections`.
- CSV via CsvHelper — single file with a `section` column for combined reports.
- PDF via QuestPDF — header (recruit, department, range, generated-at), summary counts,
  per-section tables, page numbers.
- Frontend: recruit picker (manager/admin), range presets + custom range, section checkboxes,
  live preview, download buttons.
- **Tests**: range validation (`from ≤ to`, ≤ 366 days), scope enforcement, CSV golden file,
  PDF content-type/filename and non-empty output.

### M6 — Responsive UI + end-to-end verification
- Responsive pass across all screens down to 360 px: sidebar → bottom nav, tables → cards,
  modals full-screen on mobile.
- Accessibility pass: keyboard navigation, focus traps, labelled inputs, contrast ≥ 4.5:1,
  status/severity conveyed by text as well as colour.
- Consistency pass on loading / empty / error states and toasts.
- Introduce `@playwright/test` and a **small** suite — business-critical journeys only, run
  against the API with a throwaway SQLite file and seeded fixture users:

  | Role | Journey |
  |---|---|
  | Recruit | register/login → create task → dashboard reflects it → create and update an issue → generate a report |
  | Manager | login → open an assigned recruit → confirm read-only (no write controls, writes rejected) |
  | Admin | login → manage a user's role and assignment |
  | Security | recruit blocked from an admin route; manager blocked from an unassigned recruit |

- Add the E2E job to CI (`npx playwright install --with-deps`, start API + preview build).
- Manual verification with a recording for anything outside that table.

### M7 — Two extensions

Confirmed:

1. **Onboarding checklist templates** — admin-defined per-department checklists a recruit can
   apply, seeding tasks; dashboard shows checklist completion separately. Adds
   `ChecklistTemplate` and `ChecklistItem` tables (+ migration) in this milestone, admin endpoints
   to manage templates and a recruit endpoint to apply one.
2. **Global search + charts** — one search endpoint across all four entry types with grouped,
   scope-respecting results, plus dashboard charts (entries per day, task status over time,
   issues opened vs resolved). No new tables.

Open for approval when M7 starts: charts need a rendering approach — either hand-rolled SVG (no
new dependency) or a charting library, which is outside the approved list.

---

## 4. Testing Strategy

| Layer | Tooling | Scope |
|---|---|---|
| Unit | xUnit, built-in `Assert.*` | validators, status transitions, permission handler, report builders |
| Integration | `WebApplicationFactory` + temp-file SQLite per test class | every endpoint: happy path, validation failure, each role |
| Frontend unit | Vitest + React Testing Library | forms, guards, filter state, API client 401 handling |
| E2E (M6) | Playwright | the business-critical journeys above only — kept small by design (ADR-005) |

Permission tests are table-driven across `{recruit-own, recruit-other, assigned-manager,
unassigned-manager, admin, anonymous}` for every endpoint — the highest-risk area. Coverage
target ≥ 80% on service/permission layers, reported in CI (not a hard gate initially).

---

## 5. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| No refresh tokens → sessions expire mid-work | 60-minute token lifetime; clean 401 → login redirect preserving the attempted route |
| Token reachable from JavaScript → XSS exposure | short expiry, `sessionStorage` never `localStorage`, no `dangerouslySetInnerHTML`; no cookies means no CSRF surface |
| SQLite lacks case-insensitive unique index and array columns | lower-cased email column + `note_tags` child table |
| Hard deletes are irreversible | explicit confirmation dialogs; deletes restricted to the owning recruit |
| Incremental migrations diverging from seed data | seed is idempotent and re-run on startup in development only |
| PDF library licensing/size | QuestPDF Community licence fits this scope; fallback is an HTML print stylesheet |
| .NET 10 tooling drift on CI | pin the SDK in `global.json` and in the CI setup step |
| Scope creep | features limited to the approved requirements; extensions only in M7 |
| E2E suite becomes slow and brittle | scope frozen to the journeys in M6; everything else stays in unit/integration tests |
| Hand-rolled `fetch` wrapper instead of a client library | keep it small and unit-tested (base URL, JSON, `ProblemDetails` errors, 401 handling) |
| .NET SDK missing from the VM snapshot (installed ad hoc into `~/.dotnet`) | add the SDK install to the environment blueprint so future sessions and CI match |

---

## 6. Sequencing & Effort

Estimated in Devin sessions, not calendar time:

| Session | Contents |
|---|---|
| 1 | M0 + M1 |
| 2 | M2 + M3 |
| 3 | M4 + M5 |
| 4 | M6 |
| 5 | M7 (two extensions) |

Prerequisite: the empty `codev-workshops/onboarding-diary` repo must exist — I cannot create
repositories (`createRepository: Resource not accessible by integration` for my token).

---

## 7. Follow-ups for You

1. Create the empty private repo `codev-workshops/onboarding-diary` — I cannot create
   repositories with my token.
2. `docs/requirements.md` (v0.2) still describes anonymous feedback (D2), admin temporary
   passwords (A5), soft deletes (B2), `Authorization: Bearer` and `app.db`. All five are
   contradicted by this plan, `architecture.md` and ADR-003/004 — say the word and I will align
   that document.
3. The initial-admin seed needs its environment variable names and a local default agreed at M1
   (proposal: `ADMIN_EMAIL` / `ADMIN_PASSWORD`, startup fails fast if unset outside development).
4. Charts rendering approach for M7 (see above) — hand-rolled SVG unless a charting library is
   approved.

Settled: assertions use built-in xUnit `Assert.*`; styling is Tailwind CSS; authentication is the
ADR-006 bearer-token model; the approved dependency list is §2.1 of [`../AGENTS.md`](../AGENTS.md), and
anything outside it — or any new architectural pattern — needs approval first.
