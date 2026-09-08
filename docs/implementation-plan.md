# Onboarding Diary — Implementation Plan

Version 0.2 — revised per the locked corrections. Companion to
`onboarding-diary-requirements.md`. Nothing implemented yet.

Stack (unchanged): **.NET 10 / ASP.NET Core Minimal APIs / EF Core / SQLite** backend,
**React + TypeScript + Vite + React Router** frontend, **JWT bearer access tokens**.

### Locked constraints applied in this revision
1. **Work directly on `main`** — no `devin/*` branches, no milestone PRs unless later requested.
2. **Access tokens only** — no refresh tokens, no refresh-token storage, no rotation, no reuse
   detection, no token-family revocation. Logout clears the token client-side.
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

---

## 1. Repository Layout

Single repo, work committed straight to `main`.

```
onboarding-diary/
├─ .github/workflows/ci.yml          # build + test both sides on every push to main
├─ .editorconfig  .gitignore  global.json  README.md
├─ backend/
│  ├─ OnboardingDiary.sln
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
   ├─ index.html  vite.config.ts  tsconfig.json  tailwind.config.ts
   └─ src/
      ├─ main.tsx  router.tsx        # React Router data router + role guards
      ├─ api/                        # typed fetch client, DTO types, query hooks
      ├─ auth/                       # AuthProvider (in-memory token), RequireRole
      ├─ features/{tasks,issues,feedback,notes,dashboard,reports,team,admin}/
      ├─ components/                 # DataTable, FilterBar, Modal, DateRangePicker, StatCard…
      └─ test/                       # Vitest + React Testing Library setup
```

Conventions: nullable reference types on, warnings-as-errors in CI, `dotnet format` +
ESLint/Prettier, Conventional Commits, small commits pushed to `main` per milestone.

---

## 2. Cross-Cutting Design

**Endpoint style** — Minimal APIs grouped with
`MapGroup("/api/v1/tasks").RequireAuthorization()`, one static `*Endpoints.cs` per feature,
handlers returning `TypedResults`. A validation endpoint filter converts failures into
`ValidationProblem` (RFC 7807 `ProblemDetails`).

**Authentication** — email + password login returns a **JWT bearer access token** (claims: sub,
email, role, name; lifetime 8 h so a working session does not expire mid-use, since there is no
refresh flow). The client stores it in memory with a `sessionStorage` fallback for page reloads
and attaches it as `Authorization: Bearer`. **Logout clears the client-side token**; the server
is stateless with no token store, no revocation list. Passwords hashed with ASP.NET Core's
PBKDF2 `PasswordHasher<T>`. Login is rate-limited (5 attempts / 15 min / IP) with the built-in
rate limiter. Expired token → 401 → client redirects to login.

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
table (no array type). `Data Source=app.db`, WAL enabled.

**Migrations** — one EF Core migration per milestone that changes the schema, so the schema grows
with the feature slices rather than up front.

**Errors & logging** — all failures return `ProblemDetails`; global exception handler maps
unhandled exceptions to 500 with a correlation id; structured logging with request id;
`/healthz`.

**Frontend data flow** — typed `fetch` client that attaches the bearer token and redirects to
login on 401; TanStack Query for server state and cache invalidation; React Router data router
with role guards from the auth context; React Hook Form + Zod schemas mirroring server
validation.

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
- Test infrastructure: xUnit + FluentAssertions, `WebApplicationFactory` fixture with a
  temp-file SQLite database; Vitest + RTL setup with one smoke test each.
- `ci.yml`: `dotnet build`, `dotnet test`, `npm ci`, `npm run lint`, `npm run build`,
  `npm run test`.
- Frontend application shell: layout, sidebar/topbar navigation, routing skeleton, Tailwind
  theme, placeholder pages.
- **Done when** both apps run locally, `/healthz` responds, CI green on `main`.

### M1 — Authentication + Profile
- Endpoints: `POST /auth/signup`, `POST /auth/login`, `POST /auth/change-password`,
  `GET /me`, `PATCH /me`, `GET /departments` (list for pickers).
- Password hashing, JWT issuing/validation, auth rate limiting, policies and
  `EntryAccessHandler` (consumed from M2).
- Frontend: login and signup pages (department dropdown from `GET /departments`), auth context,
  bearer-token attachment, protected routes, profile page, logout (clears token, redirects).
- **Tests**: signup validation, duplicate email 409, login failure messaging, rate limit,
  expired/invalid token → 401, role-guard matrix.

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
- Playwright end-to-end suite: signup → log task → log and resolve issue → add feedback and
  note → view dashboard → generate PDF and CSV reports; manager read-only journey; admin user
  management journey.
- Manual UI verification of the golden paths, with a recording.

### M7 — Two extensions
Proposed (to confirm before starting):
1. **Onboarding checklist templates** — admin-defined per-department checklists a recruit can
   apply, seeding tasks; dashboard shows checklist completion separately. Adds
   `ChecklistTemplate` and `ChecklistItem` tables in this milestone.
2. **Global search + charts** — one search across all four entry types with grouped results,
   plus dashboard charts (entries per day, task status over time, issues opened vs resolved).
   No new tables.

---

## 4. Testing Strategy

| Layer | Tooling | Scope |
|---|---|---|
| Unit | xUnit + FluentAssertions | validators, status transitions, permission handler, report builders |
| Integration | `WebApplicationFactory` + temp-file SQLite per test class | every endpoint: happy path, validation failure, each role |
| Frontend unit | Vitest + React Testing Library | forms, guards, filter state, API client 401 handling |
| E2E (M6) | Playwright | full golden-path journeys per role |

Permission tests are table-driven across `{recruit-own, recruit-other, assigned-manager,
unassigned-manager, admin, anonymous}` for every endpoint — the highest-risk area. Coverage
target ≥ 80% on service/permission layers, reported in CI (not a hard gate initially).

---

## 5. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| No refresh tokens → sessions expire mid-work | 8 h access-token lifetime; clean 401 → login redirect preserving the attempted route |
| Token in browser storage | in-memory first with `sessionStorage` fallback; short-lived token; no sensitive claims beyond id/role |
| SQLite lacks case-insensitive unique index and array columns | lower-cased email column + `note_tags` child table |
| Hard deletes are irreversible | explicit confirmation dialogs; deletes restricted to the owning recruit |
| Incremental migrations diverging from seed data | seed is idempotent and re-run on startup in development only |
| PDF library licensing/size | QuestPDF Community licence fits this scope; fallback is an HTML print stylesheet |
| .NET 10 tooling drift on CI | pin the SDK in `global.json` and in the CI setup step |
| Scope creep | features limited to the approved requirements; extensions only in M7 |

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

1. Create the empty private repo `codev-workshops/onboarding-diary`.
2. Confirm the two M7 extensions (checklist templates, global search + charts).
3. Note: the requirements doc (v0.2) still describes anonymous feedback (D2), admin temporary
   passwords (A5), and soft deletes (B2). Those are now removed from the plan — say the word and
   I will update `onboarding-diary-requirements.md` to match so the two documents agree.
