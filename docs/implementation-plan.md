# Onboarding Diary — Implementation Plan

Companion to [`docs/detailed-requirements.md`](./detailed-requirements.md)
(requirements, `REQ-FUNC` ids) and [`docs/openapi.yaml`](./openapi.yaml)
(API contract). Work is organised as **vertical slices**: each slice delivers
one business flow end-to-end — Next.js + MobX UI, Spring WebFlux controller
(`suspend` handlers), business logic, PostgreSQL persistence — including the
auth/authorization that flow needs. Cross-cutting concerns are built inside the
slice where they are first needed and reused afterwards.

Stack reminders (see `backend/AGENTS.md`, `frontend/AGENTS.md`,
`.agents/skills/*`): Kotlin on JDK 24, Spring Boot 4.x / Spring Framework 7,
WebFlux + coroutines with blocking JDBC offloaded via
`withContext(Dispatchers.IO)`, PostgreSQL, JUnit 5 + Testcontainers (real
Postgres, never H2); Next.js (TypeScript) with MobX stores behind a single
root store, one typed API client, token in `AuthStore`. Transport is plain
REST (decision D5).

---

## Ordering and rationale

| # | Slice | Why here |
|---|-------|----------|
| S0 | Scaffolding, DB migrations, health | Everything else needs a runnable backend, a migration mechanism and a CI-testable harness. |
| S1 | Auth / identity (bootstrap admin, invited-account signup, login, profile) | Establishes the JWT filter, principal, error envelope, validation framework, API client + `AuthStore` and the first Testcontainers integration tests. Every later slice depends on an authenticated principal. |
| S2 | Admin user management + manager assignment | Creates the `Assignment` entity **before** any manager-scoped read flow exists, so S4–S9 can enforce `AUTHZ-ASSIGN` and the feedback rule (D3) from day one instead of retrofitting. Also gives us Manager/Admin accounts to test with. |
| S3 | Task Log CRUD + filter | First diary aggregate; establishes the shared patterns (pagination helper, filter parsing, ownership check, `recruitId` scoping for managers, list/form/detail UI components) that S4–S6 copy. |
| S4 | Issue Log | Reuses S3 patterns; adds the resolution-notes rule and a second state machine. |
| S5 | Feedback Notes | Reuses S3 patterns; adds the restricted-visibility rule that depends on `Assignment` (S2). |
| S6 | Additional Notes | Reuses S3 patterns; adds tags (child table) and tag filtering. |
| S7 | Dashboard | Read model over S3–S6; only meaningful once all four entry types exist. |
| S8 | Reports (PDF/CSV) | Read model over S3–S5 plus file generation; last because it aggregates everything and has the most external dependencies (PDF library). |

**Assignment precedes manager-scoped reads**: managers can only read
entries/dashboards/reports for recruits with an `ACTIVE` assignment. Building
`Assignment` in S2 means the `AssignmentGuard` used by S3–S8 exists and is
tested before those slices are written, and the recruit-view UI for managers
can be built with real data in S3.

---

## Cross-cutting concern registry

| Concern | Introduced in | Reused by |
|---------|---------------|-----------|
| Gradle multi-module / Next.js project, Docker Compose Postgres, CI | S0 | all |
| Flyway migrations (`V1__…`) | S0 | all |
| Testcontainers base class (`AbstractIntegrationTest` with shared Postgres container) | S0 | all backend tests |
| Spring Security WebFlux + JWT filter, `Principal` (userId, role) | S1 | all secured endpoints |
| Password hashing (`PasswordEncoder` BCrypt/Argon2id) | S1 | S2 (admin create user) |
| Error envelope (`ErrorResponse`, `@ControllerAdvice`/`WebExceptionHandler`), domain exceptions → HTTP mapping | S1 | all |
| Bean Validation + custom `@ValidEmail`, email normalizer | S1 | S2 |
| Frontend: typed API client with token injection + 401 handling, `RootStore`/`AuthStore`, route guards, form error mapping | S1 | all |
| `Assignment` repository + `AssignmentGuard` (`requireCanReadRecruit(principal, recruitId)`) | S2 | S3–S8 |
| Pagination helper (`PageRequest` parsing, `Page<T>` envelope, sort whitelist) | S2 (users list) | S2–S6 |
| Ownership guard (`requireOwnerOrVisible`), `recruitId` scoping resolution (`resolveTargetRecruit(principal, recruitId?)`) | S3 | S4–S8 |
| Date-range / enum filter parsing | S3 | S4–S6, S8 |
| State-machine helper (`Transition<S>` table + `INVALID_STATE_TRANSITION`) | S3 | S4 |
| Frontend: generic paginated list + filter bar + entry form + confirm-delete components; `DiaryStore` structure per entry type | S3 | S4–S6 |
| Feedback visibility predicate (`FeedbackVisibility.canRead`) | S5 | S7, S8 |
| Dashboard read model queries | S7 | S8 (report header counts, optional) |
| PDF/CSV renderers, `Content-Disposition` streaming | S8 | — |

---

## Slices

### S0 — Project scaffolding, DB migration, health

- **Satisfies**: REQ-FUNC-092, REQ-FUNC-093 (audit columns convention), REQ-FUNC-094 (responsive layout shell).
- **Touched**
  - Backend: Gradle Kotlin DSL project, Spring Boot 4.x starters (webflux, security, validation, jdbc, actuator), Flyway, PostgreSQL driver; `application.yaml` with env-driven datasource; `V1__init.sql` (extensions, `users` table only as placeholder for S1 or empty baseline); Actuator `/health` exposing DB status.
  - Frontend: Next.js app (TypeScript, App Router), MobX, `RootStore` + `StoreProvider` skeleton, base layout (header/nav placeholder), responsive CSS baseline, `.env` with `NEXT_PUBLIC_API_BASE_URL`.
  - Infra: `docker-compose.yml` (Postgres 16), GitHub Actions workflow running backend tests (Testcontainers) and frontend lint/build.
- **Acceptance criteria**
  - `./gradlew bootRun` starts against Compose Postgres; `GET /health` → `{"status":"UP"}`; migrations applied on boot.
  - `npm run dev` renders the layout shell; `npm run build` passes.
  - CI is green on an empty PR.
- **Tests**: `HealthIT` (Testcontainers Postgres, `WebTestClient`) asserting `UP`; Flyway migration validation test (`flyway.validate()` on container).

### S1 — Identity: bootstrap admin, invited-account signup, login, profile

- **Satisfies**: REQ-FUNC-001..010, REQ-FUNC-090.
- **Entities**: `User` (`users` table, 3NF: `id uuid pk, email unique (normalized), password_hash nullable, role, status (INVITED|ACTIVE|DEACTIVATED), full_name, department, start_date, created_by_id fk users nullable, invited_at, activated_at nullable, created_at, updated_at`; check `(status = 'INVITED') = (password_hash IS NULL)`). Profile is columns on `users`, not a table or JSON. Bootstrap Admin seeded `ACTIVE` at startup from `APP_BOOTSTRAP_ADMIN_EMAIL/PASSWORD` when no `ADMIN` exists (runner, hash computed with `PasswordEncoder`) — needed here so that an Admin exists to provision the first users. Admin-side user creation (`POST /users`) is in S2; for S1 tests, `INVITED` users are inserted directly via the test fixture.
- **Endpoints**: `POST /auth/signup`, `POST /auth/login`, `POST /auth/logout`, `GET /me`, `PATCH /me`, `POST /me/password`.
- **Screens**: `/login`, `/signup`, `/profile` (profile edit + change password), authenticated shell with role-based nav, `/403`, `/404`.
- **Cross-cutting introduced**: JWT issue/verify (`jjwt` or Spring Security OAuth2 resource-server with HS256 key), `SecurityWebFilterChain` (public: `/auth/signup`, `/auth/login`, `/health`), principal extraction, `PasswordEncoder` (BCrypt strength 12 default; Argon2id switchable), `EmailNormalizer` + `@ValidEmail`, `ErrorResponse` envelope + exception mapping, Bean Validation wiring, request logging without credentials; frontend `apiClient` (attaches `Authorization`, maps `ErrorResponse` → form errors, on 401 → `authStore.clear()` + redirect), `AuthStore` (`token`, `user`, `login()`, `signup()`, `logout()`, `hydrate()` from `sessionStorage`), `RequireAuth`/`RequireRole` guards.
- **Acceptance criteria**
  - US-01, US-02, US-03 scenarios pass: signup completes an `INVITED` user (sets hash, `ACTIVE`, `activated_at`, token); unknown email → `403 NOT_INVITED`; `ACTIVE`/`DEACTIVATED` email → `409 ACCOUNT_ALREADY_ACTIVATED`; `INVITED` login → 401; normalization; invalid → 400 with field details; wrong credentials → uniform 401; expired token → 401 + redirect.
  - Bootstrap admin is created once (idempotent on restart) and can log in.
  - `password_hash` never appears in any response or log line.
  - Deactivated users (status column present now, admin flow in S2) receive 401.
- **Tests**
  - Unit: `EmailNormalizerTest`, `EmailValidatorTest` (valid/invalid corpus), `PasswordPolicyTest`, `JwtServiceTest` (expiry, tampered token).
  - Integration (Testcontainers): `BootstrapAdminIT` (seeded once, idempotent, login works); `AuthIT` — signup activates an `INVITED` fixture user, signup unknown email 403 `NOT_INVITED`, signup already-active 409, case/whitespace normalization on lookup, invalid email 400, `INVITED` login 401, login wrong password 401, login deactivated 401, `GET /me` with/without token, `PATCH /me` validation, change password wrong current 400; assert BCrypt/Argon2 prefix on stored hash.
  - Frontend: `AuthStore` unit tests (token set/clear), API client 401 handling test.

### S2 — Admin user management + manager assignment

- **Satisfies**: REQ-FUNC-011..022, REQ-FUNC-091.
- **Entities**: `Assignment` (`assignments`: `id, recruit_id fk, manager_id fk, assigned_by_id fk, status, assigned_at, ended_at, note`; **partial unique index** `(recruit_id) WHERE status='ACTIVE'`; check `recruit_id <> manager_id`). Migration `V2__assignments.sql`. User provisioning: `POST /users` creates `INVITED` users without password (`created_by_id` = admin, `invited_at = now`); email editable via `PATCH /users/{id}` only while `INVITED` (`422 EMAIL_LOCKED` otherwise).
- **Endpoints**: `GET/POST /users`, `GET/PATCH /users/{id}`, `POST /users/{id}/deactivate|reactivate`, `GET /users/{id}/assignments`, `GET/POST /assignments`, `GET /me/recruits`, `GET /me/manager`.
- **Screens**: `/admin/users` (table, filters, search, pagination), `/admin/users/new`, `/admin/users/{id}` (edit, deactivate, **manager assignment panel** with current manager, reassign select, history), `/admin/assignments`, `/recruits` (manager "My Recruits", admin "All recruits"), manager line on `/profile`.
- **Cross-cutting introduced**: pagination helper + `Page<T>` envelope + sort whitelist; `AssignmentGuard` (`isActivelyAssigned(managerId, recruitId)`, evaluated fresh on every request — no cross-request cache); role-based `@PreAuthorize`-style checks (`requireRole(ADMIN)`) using the role/status loaded from the DB for the principal on each request, not the JWT claim; atomic reassignment: end-previous + insert-new must run in **one** DB transaction on a single connection — do the whole unit inside one `withContext(Dispatchers.IO) { transactionTemplate.execute { ... } }` block (or a single SQL statement/CTE), never a `@Transactional` method that internally switches dispatcher, since the thread-bound transaction would not cover the JDBC calls; frontend `AdminStore`, `AssignmentStore`, generic `DataTable` + `Pagination` components.
- **Acceptance criteria**
  - US-04, US-05, US-06 scenarios pass: assign → active; reassign atomically supersedes; same manager → 409; invalid party → 422; role change blocked by active assignment → 422; self-deactivate → 422; non-admin → 403; manager `/me/recruits` shows only active recruits; recruit `/me/manager` shows current or null.
  - Concurrent reassignments leave exactly one `ACTIVE` row.
- **Tests**
  - Unit: assignment state transition, party validation.
  - Integration: `UserAdminIT` (list filters/pagination incl. `status=INVITED`, create any role → `INVITED` with null hash, body containing `password` → 400, duplicate email 409, invited user then completes signup → `ACTIVE`, email edit on `ACTIVE` user → 422 `EMAIL_LOCKED`, deactivate `INVITED` → signup 409, update role blocked 422, deactivate → login 401 and token 401, non-admin 403); `AssignmentIT` (assign, reassign supersedes with `endedAt`, history order, unchanged 409, invalid party 422, partial unique index violation under two parallel coroutines → one 409 `CONFLICT`, `/me/recruits` reflects reassignment immediately).
  - Frontend: `AssignmentStore` unit tests; component test for assignment panel error display.

### S3 — Task Log CRUD + filter

- **Satisfies**: REQ-FUNC-030..036.
- **Entities**: `TaskEntry` (`task_entries`: `id, recruit_id fk, entry_date, title, description, category, status, priority, created_at, updated_at`; index `(recruit_id, entry_date desc)`). Migration `V3__task_entries.sql`.
- **Endpoints**: `GET/POST /tasks`, `GET/PUT/DELETE /tasks/{id}` with filters `recruitId, from, to, category, status`.
- **Screens**: `/tasks` (list + filter bar synced to URL query + pagination + empty state), `/tasks/new`, `/tasks/{id}` (detail with edit/delete + confirm); manager/admin read-only view `/recruits/{id}` → Tasks tab.
- **Cross-cutting introduced**: `resolveTargetRecruit(principal, recruitId?)` (recruit → self or 403; manager → `AssignmentGuard` or 403 `NOT_ASSIGNED`; admin → any); ownership check returning 404 for foreign entries; `DateRangeFilter` + enum query binding; `StateMachine<TaskStatus>` + `INVALID_STATE_TRANSITION`; frontend `TaskStore` (pattern for `EntryStore<T>`), `FilterBar`, `EntryList`, `EntryForm`, `ConfirmDialog`, `useUrlFilters` hook.
- **Acceptance criteria**
  - US-07 scenarios pass: create defaults (`TODO`, `MEDIUM`); combined filters; invalid transition 422; validation 400 with field details; delete 204 then 404; foreign entry 404; manager read-only (PUT/DELETE 403), unassigned manager 403 `NOT_ASSIGNED`.
- **Tests**
  - Unit: `TaskStateMachineTest` (all allowed/disallowed transitions), filter parsing.
  - Integration: `TaskIT` — CRUD happy path; pagination totals; each filter and combinations; ownership 404; recruit passing another `recruitId` 403; manager assigned 200 / unassigned 403 / after reassignment 403; admin any 200; admin delete 204; manager PUT 403; future date 400.
  - Frontend: `TaskStore` tests (filter → query string, optimistic list update), form validation mapping test.

### S4 — Issue Log

- **Satisfies**: REQ-FUNC-040..046.
- **Entities**: `IssueEntry` (`issue_entries`: `…, severity, status, resolution_notes`). Migration `V4__issue_entries.sql`.
- **Endpoints**: `GET/POST /issues`, `GET/PUT/DELETE /issues/{id}` with filters `recruitId, from, to, status, severity`.
- **Screens**: `/issues`, `/issues/new`, `/issues/{id}`; Issues tab in `/recruits/{id}`.
- **Cross-cutting reused**: everything from S3; adds `IssueStatus` state machine and the `RESOLUTION_NOTES_REQUIRED` rule (INV-07) enforced in service and reflected in the form (notes field required when status is RESOLVED/CLOSED).
- **Acceptance criteria**: US-08 scenarios pass (RESOLVED without notes 422; OPEN→CLOSED 422; severity/status filters; manager/admin scoping as S3).
- **Tests**: Unit `IssueStateMachineTest`, `ResolutionNotesRuleTest`; Integration `IssueIT` mirroring `TaskIT` plus resolution-notes and severity filter cases.

### S5 — Feedback Notes (restricted visibility)

- **Satisfies**: REQ-FUNC-050..054.
- **Entities**: `FeedbackNote` (`feedback_notes`: `…, subject, type, details`). Migration `V5__feedback_notes.sql`.
- **Endpoints**: `GET/POST /feedback`, `GET/PUT/DELETE /feedback/{id}` with filters `recruitId, from, to, type`.
- **Screens**: `/feedback`, `/feedback/new`, `/feedback/{id}` with visibility notice; Feedback tab in `/recruits/{id}` rendered only when the API allows (probe via list call; hide on 403).
- **Cross-cutting introduced**: `FeedbackVisibility.canRead(principal, recruitId)` = owner ∨ ADMIN ∨ (MANAGER ∧ `AssignmentGuard.isActivelyAssigned`), reused by S7/S8. Detail endpoint returns 404 (not 403) for non-visible notes.
- **Acceptance criteria**: US-09 scenarios pass: current manager reads; other manager list 403 / detail 404; after reassignment old manager loses access immediately and new manager gains it; admin reads all; manager write 403.
- **Tests**
  - Unit: `FeedbackVisibilityTest` (truth table over role × ownership × assignment state).
  - Integration: `FeedbackIT` — CRUD; visibility matrix with three managers (assigned, previously assigned, never assigned) and admin; reassignment flips access within the same test; type filter; validation.

### S6 — Additional Notes

- **Satisfies**: REQ-FUNC-060..063.
- **Entities**: `AdditionalNote` (`additional_notes`) + `note_tags (note_id fk, tag)` with index on `tag`. Migration `V6__additional_notes.sql`.
- **Endpoints**: `GET/POST /notes`, `GET/PUT/DELETE /notes/{id}` with filters `recruitId, from, to, tag`.
- **Screens**: `/notes`, `/notes/new`, `/notes/{id}` with tag chips input; Notes tab in `/recruits/{id}`.
- **Cross-cutting reused**: S3 patterns; adds `TagNormalizer` (trim, lowercase, dedupe, pattern, max 10) and a `TagInput` component.
- **Acceptance criteria**: US-10 scenarios pass (normalization, tag filter, >10 tags or invalid tag 400, ownership/manager scoping as S3).
- **Tests**: Unit `TagNormalizerTest`; Integration `NoteIT` (CRUD, tags persisted/replaced on update, tag filter, scoping).

### S7 — Dashboard

- **Satisfies**: REQ-FUNC-070..074.
- **Entities**: none new (read model `DashboardSummary` computed with aggregate SQL over S3–S6 tables).
- **Endpoints**: `GET /dashboard?recruitId=`.
- **Screens**: `/dashboard` (recruit) with count cards, completion bar, open issues list, recent entries, empty states, error banner + retry; Dashboard tab in `/recruits/{id}` for manager/admin.
- **Cross-cutting reused**: `resolveTargetRecruit`, `FeedbackVisibility` (omit `feedback` block when not visible); frontend `DashboardStore`.
- **Acceptance criteria**: US-11 scenarios pass: counts/percentages correct; 0 % with no tasks; recent entries = 10 newest across kinds; manager unassigned 403; feedback block omitted for non-visible caller; 5xx shows banner.
- **Tests**: Integration `DashboardIT` — seeded fixture with known counts across all entry types verifying every number, completion rounding, recent ordering across kinds, feedback omission for a non-assigned admin-less manager vs included for assigned manager/admin; role scoping. Frontend: `DashboardStore` mapping test, empty-state rendering test.

### S8 — Reports (PDF / CSV)

- **Satisfies**: REQ-FUNC-080..086.
- **Entities**: none new (`ReportRequest` value object; queries over S3–S5).
- **Endpoints**: `GET /reports?recruitId&from&to&type&format` returning `application/pdf` or `text/csv` with `Content-Disposition`.
- **Screens**: `/reports` (recruit selector scoped by role, date range with inline validation, type/format radios, generate button with spinner, failure banner + retry); "Generate report" entry point from `/recruits/{id}`.
- **Cross-cutting introduced**: `ReportService` composing sections; `CsvRenderer` (RFC 4180 quoting, UTF-8 BOM optional) and `PdfRenderer` (OpenPDF or Apache PDFBox — both blocking, run under `withContext(Dispatchers.IO)`); streaming `DataBuffer` response; frontend download helper (fetch → blob → anchor click) inside the API client so the token is attached.
- **Acceptance criteria**: US-12 scenarios pass: PDF/CSV downloads with correct filename and content; range validation 400 (`from > to`, > 366 days); empty range still produces a document; manager assigned 200 / unassigned 403; `FEEDBACK` without visibility 403; `COMBINED` omits feedback with `X-Report-Omitted: feedback`; UI shows retry on failure and never saves a partial file.
- **Tests**
  - Unit: `CsvRendererTest` (quoting commas/quotes/newlines, `kind` column for COMBINED), `PdfRendererTest` (document opens, page count > 0, header text present via text extraction), `ReportRangeValidatorTest`.
  - Integration: `ReportIT` — seeded entries in/out of range; CSV row counts per type; PDF content-type and disposition; empty range document text; role scoping; feedback omission header; 401 without token.

---

## Definition of done (per slice)

1. Backend endpoints match `docs/openapi.yaml` (operationIds, status codes, error codes); contract drift is a bug in one or the other and must be fixed in the same PR.
2. Integration tests run against Testcontainers Postgres and pass in CI; unit tests cover every state machine / validator introduced.
3. Frontend flow works end-to-end against the local backend; all API calls go through the typed client; server data lives in MobX stores; 401 clears `AuthStore`.
4. Authorization rules for the slice (§6 of the requirements) are enforced in the API and verified by tests for each role, including the negative cases (403 / 404).
5. `AGENTS.md` / skills updated if a new convention was introduced.
