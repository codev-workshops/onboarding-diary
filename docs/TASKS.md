# Implementation Tasks — Onboarding Diary Application

Derived from [BRD.md](./BRD.md) and [TRD.md](./TRD.md).

**How to use this file**
- Tasks are listed in dependency order; within an epic they can generally be worked
  top to bottom.
- Each task is independently implementable and independently testable, and should be a
  single small PR.
- Task IDs are stable — never renumber; append new tasks instead. Retired IDs are never
  reused: `T-004` (CI pipeline, dropped by request).
- Tick the checkbox when the task is merged with its verification steps passing.

Legend: **Deps** = task IDs that must be complete first. **Verify** = how to prove the
task is done.

---

## Epic 0 — Repository and Tooling Foundation

- [x] **T-001 — Initialise the npm workspaces monorepo skeleton**
  Create the root `package.json` with workspaces `apps/*` and `packages/*`, a shared
  `tsconfig.base.json`, `.gitignore`, `.editorconfig`, and `.nvmrc` pinning Node 24.
  Create empty `apps/web`, `apps/api`, and `packages/shared` packages that build.
  Deps: none.
  Verify: `npm install` succeeds at the root and `npm run build` is a no-op success in
  every workspace.

- [x] **T-002 — Add lint, format, and typecheck tooling**
  ESLint (TypeScript + React rules) and Prettier at the root with per-workspace
  overrides; root scripts `lint`, `format:check`, `typecheck`.
  Deps: T-001.
  Verify: `npm run lint`, `npm run format:check`, and `npm run typecheck` pass on the
  clean tree; a deliberately unused variable fails lint.

- [x] **T-003 — Add the Vitest test harness**
  Configure Vitest in `apps/api`, `apps/web`, and `packages/shared`; add a root `test`
  script that runs all workspaces, plus coverage reporting.
  Deps: T-001.
  Verify: a trivial passing test runs in each workspace via `npm test` from the root.

- [x] **T-005 — Add Docker Compose for local development**
  Services for `postgres:16` (named volume), `api`, and `web`; `.env.example` covering
  every variable in TRD Section 9.
  Deps: T-001.
  Verify: `docker compose up` starts all three containers; PostgreSQL accepts a
  connection with the documented credentials.

- [x] **T-006 — Configure pre-commit hooks**
  Husky plus lint-staged running ESLint and Prettier on staged files.
  Deps: T-002.
  Verify: committing a badly formatted file is blocked or auto-fixed by the hook.

---

## Epic 1 — Shared Contracts

- [x] **T-010 — Define enums and display labels in `packages/shared`**
  `Role`, `TaskCategory`, `TaskStatus`, `TaskPriority`, `IssueSeverity`, `IssueStatus`,
  `FeedbackType` with their human-readable label maps (TRD 3.2).
  Deps: T-001, T-003.
  Verify: unit test asserts every enum member has a non-empty label.

- [x] **T-011 — Define shared Zod schemas and DTO types**
  Auth, user, and all four entry types (create and update variants), pagination and
  filter query schemas, the paginated response wrapper, and the error envelope
  (TRD 4.1, 6.1).
  Deps: T-010.
  Verify: unit tests covering accepted and rejected payloads for each schema, including
  the future-date rule and the `pageSize` clamp.

---

## Epic 2 — Database and Persistence

- [x] **T-020 — Set up Prisma and the initial migration for `User`**
  Prisma client, datasource, `User` model with the self-referential `managerId`,
  indexes, and the `managerId <> id` check constraint (TRD 3.3).
  Deps: T-005, T-010.
  Verify: `prisma migrate dev` applies cleanly; a test inserts a user and reads it back;
  self-referencing `managerId` is rejected by the database.

- [x] **T-021 — Add the `TaskEntry` model and migration**
  Columns, defaults, and the three indexes from TRD 3.3.
  Deps: T-020.
  Verify: migration applies; deleting a user with tasks is refused (restrict).

- [x] **T-022 — Add the `IssueEntry` model and migration**
  Deps: T-020.
  Verify: migration applies; defaults are `OPEN` and `MEDIUM`.

- [x] **T-023 — Add the `FeedbackNote` model and migration**
  Deps: T-020.
  Verify: migration applies; `type` is required.

- [x] **T-024 — Add the `Note`, `Tag`, and `NoteTag` models and migration**
  Unique lowercase tag names; join rows cascade when a note is deleted.
  Deps: T-020.
  Verify: migration applies; deleting a note removes its `NoteTag` rows and leaves the
  `Tag` rows intact.

- [x] **T-025 — Add the `RefreshToken` model and migration**
  Deps: T-020.
  Verify: migration applies; `tokenHash` uniqueness is enforced; deleting a user
  cascades their tokens.

- [x] **T-026 — Add a Prisma enum parity test**
  Assert the Prisma enum values match `packages/shared` exactly (TRD 2.3).
  Deps: T-010, T-021, T-022, T-023.
  Verify: the test fails if an enum value is added on one side only.

- [x] **T-027 — Add the development seed script**
  One admin, two managers, six recruits with manager links, and sample entries across
  all four categories and date ranges.
  Deps: T-021, T-022, T-023, T-024.
  Verify: `npm run seed` is idempotent and produces the documented row counts.

---

## Epic 3 — API Foundation

- [x] **T-030 — Bootstrap the Express application**
  App factory, `helmet`, CORS restricted to `WEB_ORIGIN` with credentials, JSON body
  parser with a 256 KB limit, and a listening entrypoint separated from the app for
  testability.
  Deps: T-001, T-020.
  Verify: Supertest can request the app in-process without opening a port.

- [x] **T-031 — Add startup configuration validation**
  Zod-validated environment loading; refuse to start on a missing variable or a
  `JWT_SECRET` shorter than 32 characters (TRD 9).
  Deps: T-030.
  Verify: unit test asserts the failure message for each missing or invalid variable.

- [x] **T-032 — Add the request logger and `requestId`**
  Structured JSON logs with `requestId`, method, path, status, and duration; the
  `requestId` is attached to the request and echoed in error responses.
  Deps: T-030.
  Verify: test asserts a `requestId` is generated per request and appears in the log
  line.

- [x] **T-033 — Add typed errors and the central error handler**
  `AppError` subclasses, Prisma error translation, the standard error envelope, and the
  status/code table from TRD 6.2.
  Deps: T-032.
  Verify: unit tests map each error type to the expected status, code, and body; an
  unexpected throw yields a generic 500 with no internal detail.

- [x] **T-034 — Add the validation middleware**
  Validate `params`, `query`, and `body` against Zod schemas, strip unknown fields, and
  emit 422 with per-field `details`.
  Deps: T-011, T-033.
  Verify: test asserts a multi-field failure returns every offending field.

- [x] **T-035 — Add the pagination and sorting helper**
  Parse and clamp `page`/`pageSize`, build Prisma `skip`/`take`/`orderBy`, and shape the
  `meta` block.
  Deps: T-011.
  Verify: unit tests for defaults, the 100 maximum, and invalid input.

- [x] **T-036 — Add the `/health` endpoint**
  Liveness plus a database round-trip; 503 when the database is unreachable.
  Deps: T-030, T-020.
  Verify: integration test returns 200 with the database up and 503 when the client is
  stubbed to fail.

- [x] **T-037 — Add the API integration test harness**
  Test database bootstrap (migrate then truncate between tests), a factory for users
  and entries, and a helper that returns an authenticated agent for a given role.
  Deps: T-030, T-027.
  Verify: two consecutive suites run against a clean database with no cross-talk.

---

## Epic 4 — Authentication and Authorisation

- [x] **T-040 — Implement password hashing and the policy check**
  argon2id with the documented parameters, length rules, and the common-password
  deny-list (TRD 5.1).
  Deps: T-030.
  Verify: unit tests for hash/verify round-trip, rejection of short and deny-listed
  passwords, and that the hash is never the plaintext.

- [x] **T-041 — Implement access-token issuing and verification**
  HS256 JWT with a 15-minute TTL and `sub`/`role` claims, plus a verify helper.
  Deps: T-031, T-040.
  Verify: unit tests for a valid token, an expired token, a wrong signature, and a
  malformed token.

- [x] **T-042 — Implement refresh-token storage and rotation**
  CSPRNG token, SHA-256 storage, rotation on use, and family revocation on reuse of a
  revoked token (TRD 5.2).
  Deps: T-025, T-041.
  Verify: integration tests for rotate-succeeds, reuse-revokes-family, and
  expired-token-rejected.

- [x] **T-043 — Implement `POST /auth/signup`**
  Create a `RECRUIT`, hash the password, issue tokens, set the refresh cookie
  (FR-A1 to FR-A3, AC-1).
  Deps: T-034, T-040, T-042.
  Verify: integration tests for success, duplicate email → 409, weak password → 422,
  and that the role is always `RECRUIT` even if the body says otherwise.

- [x] **T-044 — Implement `POST /auth/login`**
  Uniform failure message and timing, and refusal for inactive users
  (FR-A4, FR-A7, AC-2).
  Deps: T-043.
  Verify: integration tests for success, wrong password, unknown email (identical
  response), and an inactive user.

- [x] **T-045 — Implement `POST /auth/refresh` and `POST /auth/logout`**
  Rotate on refresh; revoke on logout; refresh fails for an inactive user (FR-A5).
  Deps: T-042.
  Verify: integration tests for refresh success, refresh after logout → 401, and
  refresh for a deactivated user → 401.

- [x] **T-046 — Add the `requireAuth` middleware and `GET /auth/me`**
  Attach `req.user`; 401 on a missing, malformed, or expired token (AC-11).
  Deps: T-041, T-033.
  Verify: integration tests for the three 401 cases and a successful `/auth/me`.

- [x] **T-047 — Add the `requireRole` middleware**
  Role gate producing 403 with the `FORBIDDEN` code.
  Deps: T-046.
  Verify: unit and integration tests for each allowed and denied role.

- [x] **T-048 — Implement `resolveEntryAccess` and the entry-access middleware**
  The full read/write matrix from TRD 5.3, including 403 for entries the caller does not
  own and stripping a body `ownerId` (FR-X1, FR-X2, FR-X3).
  Deps: T-046.
  Verify: a table-driven unit test covering every cell of the matrix, plus an
  integration test proving a manager write attempt returns 403.

- [x] **T-049 — Add rate limiting**
  Auth-endpoint, report, and global per-user limits with `Retry-After` (TRD 5.4).
  Deps: T-044.
  Verify: integration test exceeds the login limit and asserts 429 plus the header.

---

## Epic 5 — User and Profile API

- [x] **T-050 — Implement `GET /users/me` and `PATCH /users/me`**
  Editable fields limited to `fullName`, `department`, `startDate`; attempts to change
  `role` or `email` are ignored (FR-A6).
  Deps: T-046, T-034.
  Verify: integration tests for a successful update and for silently ignored
  privileged fields.

- [x] **T-051 — Implement `GET /users` and `GET /users/:id`**
  Admin search by `q`, `role`, `department`, `isActive`, paginated; `GET /users/:id`
  allowed for admin, the user's manager, or self (FR-U1).
  Deps: T-047, T-035, T-048.
  Verify: integration tests for filter combinations, pagination, and 403 for a
  non-admin listing users.

- [x] **T-052 — Implement `PATCH /users/:id` for role and activation**
  Admin-only role change and activate/deactivate, with admin self-protection
  (FR-U2, FR-U4, FR-U5, AC-10).
  Deps: T-051.
  Verify: integration tests for a role change, deactivation, self-demotion → 422, and
  self-deactivation → 422.

- [x] **T-053 — Implement manager assignment with cycle prevention**
  Set or clear `managerId`; reject self-assignment and any cycle by walking the chain
  (FR-U3, FR-U6).
  Deps: T-052.
  Verify: unit tests for chain walking; integration tests for a valid assignment,
  self-assignment → 422, and a two-hop cycle → 409.

- [x] **T-054 — Implement `GET /users/me/direct-reports`**
  Direct reports with per-recruit task progress, open-issue count, and last activity
  date (FR-D5).
  Deps: T-053, T-021, T-022.
  Verify: integration test with two managers asserts each sees only their own reports
  and that the summary numbers are correct.

---

## Epic 6 — Task Log API

- [x] **T-060 — Implement `POST /tasks` and `GET /tasks/:id`**
  Owner taken from the session; validation per T-011 including the future-date rule
  (FR-T1, FR-T9, AC-3).
  Deps: T-021, T-034, T-048.
  Verify: integration tests for create success, missing title → 422, future date → 422,
  a spoofed body `ownerId` being ignored, and reading another user's task → 403.

- [x] **T-061 — Implement `GET /tasks` with filters and pagination**
  `from`, `to`, `category`, `status`, `priority`, `ownerId`; default sort
  `entryDate DESC, createdAt DESC` (FR-T4, FR-T5, AC-4).
  Deps: T-060, T-035.
  Verify: integration tests for each filter, a combined filter, accurate `meta.total`,
  and page-2 correctness.

- [x] **T-062 — Implement `PATCH /tasks/:id` and `DELETE /tasks/:id`**
  Owner-only writes; admin override (FR-T2, FR-T3).
  Deps: T-060.
  Verify: integration tests for an update, a delete, a non-owner write → 403, and an
  admin write succeeding.

---

## Epic 7 — Issue Log API

- [x] **T-070 — Implement `POST /issues` and `GET /issues/:id`**
  Defaults `OPEN` and `MEDIUM` (FR-I1, FR-I5, FR-I6, AC-5).
  Deps: T-022, T-034, T-048.
  Verify: integration tests for create with defaults applied and validation failures.

- [x] **T-071 — Implement `GET /issues` with filters and pagination**
  `from`, `to`, `status`, `severity`, `ownerId`, including comma-separated multi-value
  enums (FR-I3, FR-I4).
  Deps: T-070, T-035.
  Verify: integration tests for severity and status filters, including
  `status=OPEN,IN_PROGRESS`.

- [x] **T-072 — Implement `PATCH /issues/:id` and `DELETE /issues/:id`**
  Includes updating `status` and `resolutionNotes` (FR-I2, FR-I7).
  Deps: T-070.
  Verify: integration tests for resolving an issue with notes and for non-owner
  write → 403.

---

## Epic 8 — Feedback and Notes API

- [x] **T-080 — Implement feedback CRUD**
  `POST`, `GET /:id`, `PATCH`, `DELETE` for `/feedback` (FR-F1 to FR-F3).
  Deps: T-023, T-034, T-048.
  Verify: integration tests for create, update, delete, missing `type` → 422, and
  non-owner access → 403.

- [x] **T-081 — Implement `GET /feedback` with filters and pagination**
  `from`, `to`, `type`, `ownerId` (FR-F4).
  Deps: T-080, T-035.
  Verify: integration test filters by type and asserts counts.

- [x] **T-082 — Implement tag normalisation and upsert**
  Lowercase, trim, de-duplicate, and length-limit tags; upsert `Tag` rows and rewrite
  `NoteTag` inside a transaction (FR-N2, AC-6).
  Deps: T-024.
  Verify: unit test asserts `"Setup, setup , VPN"` becomes `["setup","vpn"]`;
  integration test asserts no duplicate `Tag` rows are created.

- [x] **T-083 — Implement notes CRUD**
  `POST`, `GET /:id`, `PATCH`, `DELETE` for `/notes`, with tags handled via T-082
  (FR-N1, FR-N3).
  Deps: T-082, T-034, T-048.
  Verify: integration tests for create with tags, replacing tags on update, and delete
  removing join rows.

- [x] **T-084 — Implement `GET /notes` with filters and pagination**
  `from`, `to`, repeatable `tag`, `ownerId` (FR-N4).
  Deps: T-083, T-035.
  Verify: integration test filters by a single tag and by two tags.

---

## Epic 9 — Dashboard API

- [x] **T-090 — Implement dashboard aggregate queries**
  `GROUP BY` counts for tasks by status, issues by status and severity, and totals per
  entry type, scoped by owner (FR-D1 to FR-D3, AC-7).
  Deps: T-021, T-022, T-023, T-024.
  Verify: unit tests on the shaping helper; integration test with a fixed fixture
  asserts 4/10 and 40% completion and an open-issue count of 2.

- [x] **T-091 — Implement the recent-activity union query**
  `UNION ALL` across the four entry tables, ordered by `entryDate DESC, createdAt DESC`,
  limited to five, each row labelled with its `kind` (FR-D4).
  Deps: T-090.
  Verify: integration test with entries in all four categories asserts the exact
  ordering and labels.

- [x] **T-092 — Implement `GET /dashboard` with access scoping**
  Defaults to the caller; another `ownerId` requires an authorised relationship
  (FR-D6, AC-8).
  Deps: T-091, T-048.
  Verify: integration tests for self, manager viewing a direct report, manager viewing a
  non-report → 403, and recruit viewing another recruit → 403.

- [x] **T-093 — Implement `GET /dashboard/admin`**
  Organisation-wide counts and user totals by role and active state (FR-D7).
  Deps: T-092, T-047.
  Verify: integration tests for admin success and non-admin → 403.

---

## Epic 10 — Reports API

- [x] **T-100 — Implement report data assembly**
  Fetch the selected sections for an owner over an inclusive date range; validate
  `from <= to` and the 366-day maximum (FR-R1, AC-9).
  Deps: T-061, T-071, T-081, T-084.
  Verify: unit tests for range validation; integration test asserts boundary dates are
  included exactly once.

- [x] **T-101 — Implement the CSV renderer**
  One block per section with a `# SECTION:` marker and a header row, streamed
  (FR-R2, TRD 4.6).
  Deps: T-100.
  Verify: unit test asserts the exact CSV text for a fixed fixture, including quoting of
  commas and newlines in descriptions.

- [x] **T-102 — Implement the PDF renderer**
  Cover block with name, department, start date, range, generation timestamp, and
  summary counts, then one table per section, streamed (FR-R2).
  Deps: T-100.
  Verify: test asserts a `%PDF` header, a non-trivial byte length, and that extracted
  text contains the recruit's name, the range, and each section heading.

- [x] **T-103 — Implement `POST /reports` with access control and download headers**
  Format selection, `Content-Type`, and the descriptive `Content-Disposition` filename
  (FR-R3 to FR-R6).
  Deps: T-101, T-102, T-048, T-049.
  Verify: integration tests for recruit-self, manager-for-report, manager-for-non-report
  → 403, recruit-for-other → 403, admin-for-anyone, and the filename pattern.

- [x] **T-104 — Handle the empty-range report case**
  A valid file stating there are no entries, in both formats (FR-R7).
  Deps: T-103.
  Verify: integration tests assert 200 and the "No entries" content for CSV and PDF.

---

## Epic 11 — Frontend Foundation

- [ ] **T-110 — Scaffold the Vite React app with Tailwind and routing**
  App shell, router, 404 route, and base layout; responsive down to 360 px.
  Deps: T-001, T-002.
  Verify: `npm run build` succeeds; a smoke test renders the shell.

- [ ] **T-111 — Implement the typed API client**
  Base URL from the environment, bearer header injection, error-envelope normalisation
  into `ApiError`, and a single silent refresh on 401 followed by redirect
  (TRD 6.4, FR-A8).
  Deps: T-110, T-011.
  Verify: unit tests with a mocked fetch for success, 422 mapping, one-shot refresh
  then retry, and refresh failure → redirect.

- [ ] **T-112 — Implement the auth context and session storage**
  In-memory access token, refresh on load, `login`/`logout`/`signup` actions, and the
  current-user query.
  Deps: T-111.
  Verify: unit tests assert the token is never written to `localStorage` and that state
  clears on logout.

- [ ] **T-113 — Add protected and role-aware routes**
  Redirect unauthenticated users to login preserving the intended destination; render an
  access-denied screen for insufficient roles (UF-7, TRD 6.4).
  Deps: T-112.
  Verify: unit tests for the redirect-with-return-path and the access-denied render.

- [ ] **T-114 — Add TanStack Query setup and query-key conventions**
  Provider, defaults, and a documented key factory per resource so mutations invalidate
  correctly.
  Deps: T-111.
  Verify: unit test asserts a task mutation invalidates both the task list and the
  dashboard keys.

- [ ] **T-115 — Add shared UI primitives**
  Button, input, select, date input, textarea, tag input, badge, table, pagination
  control, confirmation dialog, empty state, error state (with `requestId`), and skeleton
  loader — all keyboard accessible.
  Deps: T-110.
  Verify: unit tests for the confirmation dialog, the tag input, and pagination;
  keyboard focus order asserted for the dialog.

- [ ] **T-116 — Add the form validation wiring**
  React Hook Form plus the shared Zod schemas, with a helper mapping 422 `details` onto
  fields (FR-X6).
  Deps: T-115, T-011.
  Verify: unit test asserts a server 422 renders inline errors on the named fields.

---

## Epic 12 — Frontend Auth and Profile

- [ ] **T-120 — Build the login page**
  Email and password form, generic failure message, and redirect to the intended route
  (AC-2).
  Deps: T-116, T-112.
  Verify: unit tests for validation errors, a failed login message, and a successful
  redirect.

- [ ] **T-121 — Build the signup page**
  Name, email, password with the strength rule; duplicate-email error mapped to the
  email field (AC-1).
  Deps: T-120.
  Verify: unit tests for the short-password error and the duplicate-email error.

- [ ] **T-122 — Build the profile page and the post-signup completion prompt**
  Edit name, department, start date; the prompt is skippable (FR-A6, UF-1).
  Deps: T-121.
  Verify: unit tests for a successful save and for skipping the prompt.

- [ ] **T-123 — Add the app navigation and logout control**
  Role-aware navigation (recruit, manager, admin) with the current user displayed.
  Deps: T-113.
  Verify: unit tests assert the visible navigation items per role and that logout clears
  the session.

---

## Epic 13 — Frontend Task Log

- [ ] **T-130 — Build the task list view**
  Table or card list with date, title, category, status, priority; loading, empty, and
  error states; pagination (FR-T4).
  Deps: T-114, T-115, T-061.
  Verify: unit tests for rendering rows, the empty state, and page changes.

- [ ] **T-131 — Build the task filter bar**
  Date range, category, status, priority, a result count, and a single reset action
  (FR-T5, UF-3).
  Deps: T-130.
  Verify: unit tests assert filter state maps to query parameters and that reset clears
  everything.

- [ ] **T-132 — Build the task create and edit form**
  Shared form for both modes with inline validation and the future-date rule
  (FR-T1, FR-T2).
  Deps: T-116, T-130.
  Verify: unit tests for create, edit prefill, and the future-date error.

- [ ] **T-133 — Add task delete with confirmation**
  Confirm dialog, then invalidate the list and dashboard queries (FR-T3, AC-3).
  Deps: T-132.
  Verify: unit tests assert cancel is a no-op and confirm removes the row.

---

## Epic 14 — Frontend Issue Log

- [ ] **T-140 — Build the issue list view with severity and status indicators**
  Deps: T-114, T-115, T-071.
  Verify: unit tests for row rendering and the empty state.

- [ ] **T-141 — Build the issue filter bar**
  Status, severity, and date range (FR-I4).
  Deps: T-140.
  Verify: unit tests for filter-to-query mapping.

- [ ] **T-142 — Build the issue create and edit form with the resolution prompt**
  Prompt for resolution notes when the status becomes Resolved or Won't Fix
  (FR-I7, AC-5).
  Deps: T-116, T-140.
  Verify: unit tests assert the notes field is surfaced and emphasised on that status
  transition.

- [ ] **T-143 — Add issue delete with confirmation**
  Deps: T-142.
  Verify: unit test for the confirm-then-remove flow.

---

## Epic 15 — Frontend Feedback and Notes

- [ ] **T-150 — Build the feedback list, filters, and form**
  Type badges, type and date filters, create and edit (FR-F1 to FR-F4).
  Deps: T-116, T-081.
  Verify: unit tests for create, the type filter, and validation.

- [ ] **T-151 — Add feedback delete with confirmation**
  Deps: T-150.
  Verify: unit test for the confirm-then-remove flow.

- [ ] **T-152 — Build the notes list with tag chips and tag filtering**
  Deps: T-115, T-084.
  Verify: unit tests for tag chip rendering and filtering by a tag.

- [ ] **T-153 — Build the note create and edit form with the tag input**
  Free-text tag entry that normalises on submit (FR-N1, FR-N2).
  Deps: T-152, T-116.
  Verify: unit tests for adding and removing tags and for normalisation before submit.

- [ ] **T-154 — Add note delete with confirmation**
  Deps: T-153.
  Verify: unit test for the confirm-then-remove flow.

---

## Epic 16 — Frontend Dashboard

- [ ] **T-160 — Build the recruit dashboard**
  Count tiles, task completion progress, open issues by severity, and recent activity
  (FR-D1 to FR-D4, AC-7).
  Deps: T-092, T-114, T-115.
  Verify: unit tests assert rendered numbers for a fixture and the correct empty state
  for a new account.

- [ ] **T-161 — Build the manager dashboard**
  Direct-report tiles with task progress, open-issue count, and last activity date
  (FR-D5).
  Deps: T-054, T-160.
  Verify: unit tests assert one tile per report and correct values.

- [ ] **T-162 — Build the read-only recruit detail view for managers**
  Tabbed diary (tasks, issues, feedback, notes) with filters and no write affordances
  (FR-D6, FR-X2, AC-8).
  Deps: T-161, T-131, T-141, T-152.
  Verify: unit tests assert no create, edit, or delete controls render in this mode.

- [ ] **T-163 — Build the admin dashboard**
  Organisation-wide counts and entry points into user management (FR-D7).
  Deps: T-093, T-160.
  Verify: unit tests for rendered totals and admin-only visibility.

---

## Epic 17 — Frontend Reports

- [ ] **T-170 — Build the report builder form**
  Date range, section checkboxes with a "Combined" shortcut, format selection, and
  range validation (FR-R1).
  Deps: T-116, T-103.
  Verify: unit tests for the combined shortcut and for the start-after-end error.

- [ ] **T-171 — Implement the file download flow**
  Authenticated `POST`, blob handling, filename from `Content-Disposition`, progress and
  failure states (FR-R2, FR-R6).
  Deps: T-170.
  Verify: unit tests with a mocked response assert the filename used and the
  download-failed state.

- [ ] **T-172 — Add report generation from the manager's recruit view**
  Report scoped to the selected recruit (FR-R4, UF-5).
  Deps: T-171, T-162.
  Verify: unit test asserts the correct `ownerId` is sent.

---

## Epic 18 — Frontend Admin User Management

- [ ] **T-180 — Build the user list with search and filters**
  Search plus role, department, and active filters, paginated (FR-U1).
  Deps: T-051, T-115.
  Verify: unit tests for search-to-query mapping and pagination.

- [ ] **T-181 — Build role change and activate/deactivate controls**
  Confirmation on deactivation; self-protection errors surfaced clearly
  (FR-U2, FR-U4, FR-U5).
  Deps: T-180, T-052.
  Verify: unit tests for a successful role change and for the self-demotion error
  message.

- [ ] **T-182 — Build the manager assignment control**
  Manager picker with cycle and self-assignment errors surfaced (FR-U3, FR-U6).
  Deps: T-181, T-053.
  Verify: unit tests for assign, clear, and the cycle error message.

---

## Epic 19 — Cross-cutting Quality and Release Readiness

- [ ] **T-190 — Add the global error boundary and error states**
  Route-level error boundary showing the `requestId`, plus a shared 403 screen
  (TRD 6.4).
  Deps: T-113, T-115.
  Verify: unit test asserts a thrown render error shows the boundary with the retry
  action.

- [ ] **T-191 — Add the accessibility and responsiveness pass**
  Labels, focus order, visible focus styling, contrast, and a 360 px layout review
  across every screen (FR-X5, AC-12).
  Deps: Epics 12 to 18.
  Verify: automated a11y assertions on key screens plus a documented manual checklist at
  360 px, 768 px, and 1280 px.

- [ ] **T-192 — Enforce the coverage gate in CI**
  80% lines on `apps/api/src/modules` and `packages/shared` (TRD 8).
  Deps: T-003, Epics 4 to 10.
  Verify: `npm run test:coverage` fails when coverage drops below the threshold.

- [ ] **T-193 — Write the developer README**
  Setup, environment variables, running with Docker Compose, migrations, seeding,
  testing, and project structure.
  Deps: T-005, T-027.
  Verify: a fresh clone reaches a running app by following the README only.

- [ ] **T-194 — Add the deployment configuration and runbook**
  Production build, migration-on-deploy step, required environment variables, health
  check wiring, and log expectations (TRD 7, TRD 9).
  Deps: T-193.
  Verify: a production build runs against a fresh database with migrations applied and
  `/health` returning 200.

- [ ] **T-195 — Traceability check against the BRD**
  Confirm every `FR-*` and `AC-*` is covered by at least one task and one automated
  test; record the mapping in `docs/TRACEABILITY.md`.
  Deps: all preceding tasks.
  Verify: the matrix has no gaps and is reviewed.
