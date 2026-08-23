# Onboarding Diary

A diary application for new recruits: daily tasks, blockers, onboarding feedback and personal notes,
with manager-scoped views and reporting on top.

- Full requirements: `docs/specification.md`
- Architecture review that this build follows (MVP scope, simplifications, milestones): `docs/architecture-review.md`

> **Status: Milestone 9 of 10 complete.** The skeleton, database, seed data, authentication, the
> authorization core, the **task diary**, the **issue log**, **onboarding feedback**, **personal
> notes** and the **dashboards** are in place: `readable_user_ids` is enforced in SQL by scoped
> repositories, every entry API, aggregate and UI sits on top of those repositories, and the
> authorization matrix is proved twice — once against the guards and once through the HTTP handlers.
> **Reports with CSV and PDF export** are in place; **admin user management is not implemented yet.** See
> [Implementation status](#implementation-status).

## Quick start

```bash
cp .env.example .env
npm ci

docker compose up -d db     # PostgreSQL 16 on localhost:5432
npm run db:migrate          # apply migrations
npm run db:seed             # demo departments, users and ~130 diary entries
npm run dev                 # http://localhost:3000
```

Health probe:

```bash
curl -s localhost:3000/api/health
# {"status":"ok","database":"up","timestamp":"..."}
```

To run the whole stack (app + database) in containers instead:

```bash
docker compose up --build
```

A one-shot `migrate` service applies migrations and runs the seed before the app starts; both steps are
idempotent, so this is safe on every `up`. The application image itself ships no migration tooling.

## Demo credentials

Every seeded account uses the same password: **`Passw0rd!23`** (override with `SEED_PASSWORD`).

| Email                          | Role    | Department        | Reports to  |
| ------------------------------ | ------- | ----------------- | ----------- |
| `admin@onboarding.test`        | Admin   | People Operations | —           |
| `marcus.bell@onboarding.test`  | Manager | Engineering       | —           |
| `dana.lee@onboarding.test`     | Manager | Product           | —           |
| `priya.sharma@onboarding.test` | Recruit | Engineering       | Marcus Bell |
| `sam.okafor@onboarding.test`   | Recruit | Engineering       | Marcus Bell |
| `tom.nguyen@onboarding.test`   | Recruit | Design            | Marcus Bell |
| `aisha.khan@onboarding.test`   | Recruit | Product           | Dana Lee    |
| `ben.carter@onboarding.test`   | Recruit | Product           | Dana Lee    |
| `chloe.martin@onboarding.test` | Recruit | Design            | Dana Lee    |
| `noah.silva@onboarding.test`   | Recruit | Engineering       | — (none)    |

The org chart is shaped to make authorization failures obvious rather than subtle:

- **Two managers with disjoint recruit sets.** Marcus must never see Dana's recruits and vice versa, so
  any scope leak shows up as unfamiliar names rather than as a plausible-looking extra row.
- **One recruit with no manager.** Noah Silva is visible to admins only, which catches the classic
  "`manager_id IS NULL` matches everything" bug in a scope predicate.
- **Entries on both sides of the boundary.** Every recruit has tasks, issues, feedback and notes across
  their onboarding window, so a manager report can never be empty by accident.

Credentials are demo-only and are seeded with the same bcrypt (cost 12) hashing path the application
will use for real signups.

## Architecture

A **modular monolith**: one Next.js 15 application serving both the UI and the REST API, backed by
PostgreSQL through Prisma. No separate backend service, no queue, no cache tier — none of them earn
their operational cost at this size, and a single deployable keeps the authorization story reviewable
in one place.

```
app/
  (public)/            login, signup                         done
  (app)/tasks          task diary: list, filters, CRUD       done
  (app)/issues         issue log: list, filters, CRUD        done
  (app)/feedback       onboarding feedback: list, CRUD       done
  (app)/notes          personal notes: list, tags, CRUD      done
  (app)/dashboard      own summary, open issues, activity    done
  (app)/team           roster and recruit detail (mgr/admin) done
  (app)/admin/overview organisation-wide summary (admin)     done
  (app)/reports        date-ranged reports and exports       done
  (app)/admin/users    user and department administration    done
  change-password      forced change of a temporary password done
  api/v1/auth/...      signup, login, logout, me             done
  api/v1/tasks         list, create, read, patch, delete     done
  api/v1/issues        list, create, read, patch, delete     done
  api/v1/feedback      list, create, read, patch, delete     done
  api/v1/notes         list, create, read, patch, delete     done
  api/v1/dashboard     me, team, org and per-user summaries  done
  api/v1/reports       JSON preview, CSV and PDF export      done
  api/v1/users         directory, admin CRUD, me, password   done
  api/v1/departments   public list plus admin lifecycle      done
  api/health           liveness + readiness probe            done
middleware.ts          cookie-signature gate for app routes  done
src/
  modules/
    auth/              password hashing, sessions, cookies   done
    authz/             readable_user_ids(actor), guards      done
    users/             profiles, admin CRUD, self-service    done
    entries/           scoped repositories                   done
    tasks/             task schemas, DTOs and service        done
    audit/             append-only audit writer              done
    dashboard/         grouped aggregates and rollups        done
    reports/           date-ranged reports, CSV and PDF      done
  shared/
    config/            environment parsing
    db/                Prisma client
    http/              error envelope, request wrapper
    schemas/           Zod schemas shared by API and forms
    testing/           fixtures shared by tests
prisma/
  schema.prisma        models, enums, indexes
  migrations/          SQL migrations, including CHECK constraints
  seed.ts              demo data
tests/
  unit/                Vitest, no infrastructure required
  api/                 Vitest, route-level
  integration/         Vitest against seeded Postgres — the authorization matrix
  e2e/                 Playwright
```

Layering rule: **route handler → service → scoped repository**. Handlers parse
and serialize; services hold the rules; the repository is the only thing that talks to Prisma, and it
applies the caller's scope in the SQL query itself. Handlers never construct their own `where` clause.

### The authorization model (frozen)

```
readable_user_ids(actor) :=
    ADMIN    -> every user id
    MANAGER  -> {actor.id} ∪ {u.id : u.manager_id = actor.id}
    RECRUIT  -> {actor.id}
```

This predicate is applied **inside the database query**, never as a post-filter over fetched rows, and it
covers exports as well as reads. Managers see direct reports only — the relationship is not transitive —
and it is evaluated live from `users.manager_id`, so a re-assignment takes effect on the next request.
Notes stay private to their owner: a manager cannot read a recruit's notes. On an in-scope recruit's
issue a manager may update `status` and `resolution_notes` and nothing else, and may never author or
delete entries on a recruit's behalf.

### Authorization core (M3)

| Module                       | Responsibility                                                                      |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `authz/scope.ts`             | `readableUserIds(actor)` and the `owner_id IN (…)` clause it compiles to            |
| `authz/policy.ts`            | Visibility, create/update/delete, field allow-lists, report targets                 |
| `authz/errors.ts`            | The 403-versus-404 policy, in one place                                             |
| `entries/base-repository.ts` | The only `where` an entry query is built from: scope + `deleted_at IS NULL` + notes |

The rules, and why they are shaped this way:

- **Scope is SQL, not a filter.** `scopedEntryWhere` composes the predicate; the delegate is private to the
  repository, so a handler cannot query an entry table without it.
- **403 when you named the subject, 404 when you addressed the resource.** A client-supplied `owner_id` or
  `user_ids` outside scope fails `403 OUT_OF_SCOPE`; an entry id the caller cannot see is `404`, so
  existence is never disclosed. Denials carry no identifiers.
- **In scope ≠ entitled.** Notes are owner-private even from the owner's manager, and `ADMIN_ONLY` feedback
  behaves the same way.
- **Field-level, all-or-nothing.** A manager's issue patch is limited to `status` and `resolutionNotes`; any
  other field rejects the whole request (`403 FIELD_NOT_PERMITTED`). `role`, `managerId`, `isActive` and
  `email` are never settable through the self-service profile route (`403 FORBIDDEN_FIELD`).
- **No silent narrowing.** A report naming an out-of-scope user fails; it is never quietly trimmed to the
  readable subset, because a report that looks complete and is not is worse than an error.
- **Live scope.** Nothing is cached: an admin's reassignment applies on the manager's next request.
- **Middleware is not the boundary.** It only avoids a blank flash on protected routes; every decision is
  re-made server-side from the database-backed actor.

### Authentication (M2)

| Method | Path                  | Auth   | Success | Notes                                 |
| ------ | --------------------- | ------ | ------- | ------------------------------------- |
| POST   | `/api/v1/auth/signup` | public | 201     | Always creates a `RECRUIT`            |
| POST   | `/api/v1/auth/login`  | public | 200     | Sets the session cookie               |
| POST   | `/api/v1/auth/logout` | any    | 204     | Idempotent; expires the cookie        |
| GET    | `/api/v1/auth/me`     | cookie | 200     | Current profile plus role permissions |
| GET    | `/api/v1/departments` | public | 200     | Names only; the signup form needs it  |

Every failure uses one envelope, with a `request_id` that matches the server log line:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "request_id": "6f1c…",
    "details": [{ "field": "password", "code": "TOO_SMALL", "message": "…" }]
  }
}
```

How the session works, and why:

- **One signed JWT in an `HttpOnly; SameSite=Lax; Secure` cookie, 8-hour TTL.** Nothing is kept in
  `localStorage`, so a script injection cannot read the session.
- **The token carries only the user id.** Role and `is_active` are re-read from the database on every
  request, so a deactivation or a role change takes effect on the next request rather than in eight hours.
- **No CSRF token.** `SameSite=Lax` plus a mandatory `application/json` content type means a cross-site
  form post cannot both carry the cookie and be accepted. Every state-changing handler enforces the
  content type, including logout, which reads no body. Revisit this if a non-JSON endpoint appears.
- **Login is timing-flat and message-flat.** An unknown email and a wrong password return the same
  `401 INVALID_CREDENTIALS`, and the unknown-email path still performs a bcrypt comparison.
- **`middleware.ts` only verifies the cookie signature** so anonymous visitors get a redirect instead of a
  flash of an empty page. It is not the authorization boundary: layouts, pages and route handlers each
  re-resolve the user from the database. Because middleware cannot reach the database, a session whose
  user has since been deactivated is bounced through `/signed-out`, which clears the cookie — redirecting
  straight to `/login` would ping-pong until the token expired.
- **A genuine cookie on a disabled account answers `403 ACCOUNT_DEACTIVATED`, not `401`.** The credential
  is valid and the caller is identified; only the account is switched off (AC3). A missing, expired,
  forged or orphaned cookie still answers `401 UNAUTHENTICATED`, so the pair says "who are you?" and
  "you, specifically, are disabled" without conflating them. Browser pages are unaffected: the signed-in
  layout treats both as signed out and bounces through `/signed-out`.
- **Role-aware navigation is presentation only.** The admin page 404s for a manager whether or not the
  link was rendered.

### Database

| Table              | Purpose                                      |
| ------------------ | -------------------------------------------- |
| `departments`      | Reference data for user profiles             |
| `users`            | Accounts, roles, `manager_id` self-reference |
| `task_entries`     | Daily task log                               |
| `issue_entries`    | Issues and blockers                          |
| `feedback_entries` | Onboarding feedback                          |
| `note_entries`     | Free-form notes with `text[]` tags           |

Decisions worth knowing before reading the schema:

- **Four sibling entry tables, not one polymorphic table.** The four entry types share a date, a title and
  an owner, and diverge everywhere else. A single table with nullable type-specific columns would trade a
  little service-layer duplication for the permanent loss of `NOT NULL` and enum constraints.
- **`owner_id` leads every entry index.** It is also the authorization predicate, so the fast path and the
  safe path are the same path.
- **Users are deactivated, not soft-deleted.** `is_active` is the whole lifecycle; without a `deleted_at`,
  the unique constraint on `email` stays a plain unique constraint. Entries do keep `deleted_at` so a
  recruit's history is recoverable.
- **Entries carry `updated_by` but no `created_by`.** `created_by` would equal `owner_id` in every flow the
  application supports, whereas `updated_by` is what makes a manager's edit to a recruit's issue visible.
- **PostgreSQL enums** for roles, statuses, priorities and severities; **`text[]`** for note tags with a GIN
  index, since tag search is a natural next feature and the array is capped at 10 entries by a CHECK.
- **`version` on every entry** from day one, so optimistic concurrency can be switched on without a migration.
- **CHECK constraints live in the migration SQL**, because Prisma cannot express them. The task and issue
  completion rules are deliberately **one-way** implications (`status = 'DONE'` requires `completed_at`, but
  not the converse): the biconditional in the original specification makes it impossible to cancel a
  completed task or to reopen a resolved issue without destroying its timestamp.

## Commands

| Command                    | Purpose                                                                 |
| -------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`              | Development server                                                      |
| `npm run build`            | Production build                                                        |
| `npm run lint`             | ESLint                                                                  |
| `npm run format:check`     | Prettier check (`npm run format` to write)                              |
| `npm run typecheck`        | `tsc --noEmit`                                                          |
| `npm test`                 | Vitest unit and API tests                                               |
| `npm run test:integration` | Authorization and endpoint suites against a **freshly seeded** database |
| `npm run test:e2e`         | Playwright end-to-end tests                                             |
| `npm run db:migrate`       | Create/apply migrations in development                                  |
| `npm run db:deploy`        | Apply migrations in CI and production                                   |
| `npm run db:seed`          | Seed demo data (idempotent)                                             |
| `npm run db:reset`         | Drop, re-migrate and re-seed                                            |

CI (`.github/workflows/ci.yml`) runs lint, format check, typecheck, unit tests, migrations, seed, the
authorization matrix (`npm run test:integration`), build
and Playwright against a PostgreSQL 16 service container.

## Implementation status

| Milestone | Scope                                                              | Status |
| --------- | ------------------------------------------------------------------ | ------ |
| M1        | Skeleton, tooling, Docker, schema, migration, seed, `/health`      | Done   |
| M2        | Signup, login, logout, session cookie, protected shell             | Done   |
| M3        | Authorization module, scoped repository, authorization test matrix | Done   |
| M4        | Task CRUD with filters and pagination                              | Done   |
| M5        | Issue CRUD with triage, filters and pagination                     | Done   |
| M6        | Feedback and notes                                                 | Done   |
| M7        | Recruit dashboard, manager team list and recruit detail views      | Done   |
| M8        | Date-ranged reports and CSV export                                 | Done   |
| M9        | PDF export                                                         | Done   |
| M10       | Admin user/department management and hardening                     | Done   |

Delivered in M1:

- Next.js 15 App Router, React 19, TypeScript strict mode, Tailwind CSS 4, shadcn/ui
- Prisma 6 + PostgreSQL 16, initial migration with enums, indexes and CHECK constraints
- Seed: 4 departments, 10 users, ~130 entries spread over a 60-day window
- `GET /api/health` (unauthenticated liveness/readiness probe)
- ESLint, Prettier, Vitest, Playwright, GitHub Actions CI
- `Dockerfile` (standalone multi-stage build) and `docker-compose.yml` (app + PostgreSQL)

Delivered in M2:

- `POST /api/v1/auth/signup|login|logout` and `GET /api/v1/auth/me`, plus public `GET /api/v1/departments`
- bcrypt (cost 12) hashing and an 8-hour signed session cookie; deactivated accounts cannot authenticate
- Shared error envelope with request ids, and Zod schemas shared by the API and the forms
- Login and signup screens, a role-aware application shell, and middleware-protected routes
- 40 Vitest unit/route tests and 7 Playwright auth journeys covering both roles and the failure paths

Delivered in M3:

- `src/modules/authz/{scope,policy,errors}.ts` — the single implementation of `readable_user_ids`, the
  entry policies and the 403/404 rules
- `src/modules/entries/base-repository.ts` and one scoped repository per entry table
- Scoped directory reads with an e-mail-free `UserSummary` DTO (managers never receive other addresses)
- `tests/integration/authz-matrix.spec.ts` — AZ-M1…M10 and AZ-R1…R6 against seeded Postgres, run in CI
  after `db:seed` (`npm run test:integration`)

Delivered in M4:

- `GET|POST /api/v1/tasks` and `GET|PATCH|DELETE /api/v1/tasks/{id}` — thin handlers that resolve the
  actor, validate with Zod and delegate; they hold no `where` clause of their own
- `src/modules/tasks/{schemas,service,dto}.ts` — validation, filtering, deterministic paging and an
  e-mail-free task DTO
- `src/modules/audit/service.ts` and the append-only `audit_logs` table: `AUTHZ.DENIED` for refused
  requests, and `ENTRY.CROSS_USER_UPDATED` written in the **same transaction** as any admin write into
  another user's diary
- An ESLint boundary rule plus `tests/unit/module-boundaries.spec.ts`: no route, page or component may
  import the Prisma client, and no module outside `src/modules/entries` may touch an entry delegate
- `/tasks` — server-rendered list with URL-driven filters, a responsive table/card layout, create, edit
  and delete, and read-only rows for entries the caller does not own
- `tests/integration/task-endpoints.spec.ts` — the authorization matrix re-proved through the handlers
  with real signed cookies, including the admin `{kind:'ALL'}` scope and the 403/404 policy

Delivered in M5:

- `GET|POST /api/v1/issues` and `GET|PATCH|DELETE /api/v1/issues/{id}`, on the same scoped repositories
- `src/modules/issues/{schemas,service,dto}.ts` — validation, status transitions and an e-mail-free DTO;
  `resolved_at` is derived server-side and cannot be supplied by a client
- Manager triage: a manager may patch **only** `status` and `resolution_notes` on a direct report's
  issue, all-or-nothing, audited as a cross-user write; they still cannot create or delete one
- Optimistic concurrency that is actually enforced: `expected_version` is carried into the SQL `UPDATE`
  predicate, so a stale write loses the race with `409 VERSION_CONFLICT` rather than overwriting
- `/issues` — server-rendered list with URL-driven status/severity filters, responsive table/card
  layout, and a triage-only dialog for managers
- `tests/integration/issue-endpoints.spec.ts` and `tests/unit/issue-schemas.spec.ts`

Delivered in M6:

- `GET|POST /api/v1/feedback`, `GET|PATCH|DELETE /api/v1/feedback/{id}`, and the same five for
  `/api/v1/notes`, on the same scoped repositories
- `src/modules/{feedback,notes}/{schemas,service,dto}.ts` — validation, filtering, deterministic paging
  and e-mail-free DTOs
- **Feedback visibility is a database predicate, not a UI decision**: `ADMIN_ONLY` feedback is excluded
  from a manager's list, count and direct read (404), including when the manager explicitly filters
  `visibility=ADMIN_ONLY`, and including the moment its author reclassifies it
- **Notes never leave their author**: being in a manager's scope buys nothing, and asking for a
  report's notes by `owner_id` answers 404 rather than the 403 that would confirm the reporting line
- Note tags are lower-cased and de-duplicated on write and capped at 10, so `#Access` and `#access` are
  one tag and the `tag=` filter is an indexed `has` rather than a scan
- Managers may neither author nor edit nor delete a recruit's feedback or notes — there is no triage
  equivalent here; an admin writing into another user's diary is audited in the same transaction
- `/feedback` and `/notes` — server-rendered lists with URL-driven filters, responsive card layouts,
  create, edit and delete
- `tests/integration/{feedback,note}-endpoints.spec.ts`, `tests/unit/{feedback,note}-schemas.spec.ts`,
  `tests/unit/entry-refresh.spec.ts` and `tests/e2e/feedback-notes.spec.ts`

Delivered in M7:

- `GET /api/v1/dashboard/me`, `/team`, `/org` and `/users/{id}` — one summary per scope, with a
  `days` period of 7, 30, 90 or 365 (default 30) and no other accepted query parameter
- `src/modules/dashboard/{schemas,service,dto}.ts` — the completion percentage is defined once (C3:
  cancelled tasks leave the denominator) and every metric is folded in memory from grouped rows
- **The aggregates are scoped by the same predicate as the lists.** `src/modules/entries/repositories.ts`
  holds the grouped queries because that module is the only place a Prisma delegate may be named; a
  dashboard is therefore an aggregate over exactly the rows the caller could have listed one by one, so
  a manager's roster counts zero notes and no `ADMIN_ONLY` feedback without restating either rule
- **No per-recruit query**: a manager's roster costs five grouped queries whether the team is 1 or 50,
  asserted in `tests/unit/dashboard-fanout.spec.ts`
- `/dashboard` for every role (a manager's own diary, kept separate from their team's), `/team` and
  `/team/{id}` for managers and admins, `/admin/overview` for admins, each with the period in the URL
  so a view can be shared and reloaded
- Pages answer an authorization denial with the not-found screen — the API keeps the 403/404 split,
  but a browser URL should not tell a recruit that a page exists and is refused
- `tests/integration/dashboard-endpoints.spec.ts`, `tests/unit/dashboard-{metrics,fanout}.spec.ts` and
  `tests/e2e/dashboard.spec.ts`

Delivered in M8:

- `POST /api/v1/reports` — one endpoint for both the on-screen JSON preview and the CSV download
  (O4), selected by `format`. `SELF`, `USER`, `USERS`, `DEPARTMENT` and `ORG` scopes, an inclusive
  `entry_date` range capped at 366 days, section selection and per-section filters, summary and detail
  blocks
- **A report never silently narrows.** An explicitly named out-of-scope user fails the whole request
  with `403 OUT_OF_SCOPE` rather than intersecting the request with the caller's scope; only an
  omitted `user_ids` means "everyone I may read". Rows are still read through the scoped repositories,
  so the SQL carries `owner_id ∈ readable_user_ids(actor)` as well
- Caps: 50 users, 10 000 rows per section, checked with a `count` **before** the rows are loaded, so an
  oversized report is refused with `422 REPORT_TOO_LARGE` instead of being assembled and then rejected
- `src/modules/reports/csv.ts` — UTF-8 BOM, CRLF, RFC 4180 quoting, and a leading `'` on any cell
  starting with `=`, `+`, `-`, `@`, tab or CR so a diary entry cannot become a formula in Excel. A
  multi-section export is one file with a leading `record_type` column; metadata stays out of the body
- `ENTRY.READ_PRIVILEGED` is now written whenever an admin reads another user's note or `ADMIN_ONLY`
  feedback — through a report, a list or a single fetch — one row per subject, entry ids only, never
  bodies (this was the M7 Phase 2 item; reporting made it required)
- `report_runs` records every attempt with its parameters, row count, duration and outcome, including
  `DENIED`, written best-effort so a metadata failure cannot change the response
- `tests/unit/report-{csv,schemas,service}.spec.ts`, `tests/integration/report-endpoints.spec.ts` and
  `tests/e2e/reports.spec.ts`

Delivered in M9:

- `format: 'PDF'` on the same `POST /api/v1/reports` endpoint. The renderer in
  `src/modules/reports/pdf.ts` takes the **already-authorized `ReportModel`** and never touches Prisma,
  so a PDF is byte-for-byte the same dataset the JSON preview and the CSV would have carried — there is
  no second query to get the scope wrong in
- A4 portrait, 15 mm margins, a cover block naming the scope, period, filters and confidentiality
  notice, zebra-striped summary tables, one detail section per page with the column header repeated on
  every page, and the report id, generated-at and `Page n of m` in every footer
- Free text is wrapped, and `description`, `content`, `details` and `resolution_notes` are truncated at
  500 characters with an ellipsis and a footnote pointing at the CSV for the full text
- Only the two standard PDF fonts are embedded and no remote resource is ever fetched, so a diary entry
  cannot make the renderer reach the network (SEC-14)
- `tests/unit/report-pdf.spec.ts` and the `PDF export` block of `tests/integration/report-endpoints.spec.ts`
  extract the text back out of the generated document and assert on it, so "a manager's PDF contains no
  private note and no `ADMIN_ONLY` feedback" is checked against what a reader can actually find in the
  file rather than against the model that was handed to the renderer

Delivered in M10:

- Admin user lifecycle: `GET/POST /api/v1/users`, `GET/PATCH /api/v1/users/{id}`,
  `POST /api/v1/users/{id}/{deactivate,reactivate,reset-password}` and `GET /api/v1/users/{id}/recruits`,
  behind `ADMIN` (the directory `GET` still answers managers and recruits with their own scoped view)
- The validation that makes the authorization model hold: `422 LAST_ADMIN` when the last active admin
  would be demoted or deactivated, `422 MANAGER_HAS_REPORTS` unless a demotion names `reassign_to`,
  a manager must be an active `MANAGER` or `ADMIN`, and self-assignment or a cycle in the reporting
  line is refused — a reassignment moves the recruit between managers' scopes on the next request
- Deactivation is reversible and never deletes: entries stay, stay reportable, and the account simply
  cannot authenticate. There is no hard delete of a user anywhere in the API
- Department lifecycle: create, rename, deactivate and delete, where delete is refused with
  `409 DEPARTMENT_IN_USE` while anyone is assigned; a deactivated department keeps its existing members
  and is refused for new assignments. The public `GET /api/v1/departments` still lists active names only
- Temporary passwords (US-70): an admin-created or reset account gets a generated password, returned
  exactly once in the response and never stored in plaintext or written to an audit row, and is flagged
  `must_change_password`. Until it is replaced, every API call but `GET /users/me` and
  `POST /users/me/password` is refused with `403 PASSWORD_CHANGE_REQUIRED`, and the browser shell
  redirects to `/change-password`
- Self-service `GET/PATCH /api/v1/users/me` and `POST /api/v1/users/me/password`; naming `role`,
  `manager_id`, `is_active` or `email` in the PATCH fails the whole request with `403 FORBIDDEN_FIELD`
  rather than being quietly ignored
- The audit actions the specification asks for are now all written: `AUTH.LOGIN_SUCCESS`,
  `AUTH.LOGIN_FAILED`, `AUTH.LOGOUT`, `AUTH.PASSWORD_CHANGED`, `AUTH.PASSWORD_RESET`, `USER.*` and
  `DEPARTMENT.*`. User and department changes share the write's transaction; authentication events are
  best-effort, because a failed audit write must not turn a valid sign-in into an error
- `tests/unit/{admin,self}-schemas.spec.ts`, `tests/integration/{admin-endpoints,self-service}.spec.ts`
  and `tests/e2e/admin.spec.ts`

### Running the integration suite

`npm run test:integration` reads the seeded users by e-mail and asserts against seeded row counts, so it
requires a **freshly seeded** database:

```bash
npm run db:reset && npm run test:integration
```

The endpoint suites create their own fixtures and delete them again, but rows left behind by an earlier
end-to-end run (which writes through the UI as a real recruit) will fail the count assertions. CI gets
this for free because it seeds a fresh service container.

## Assumptions

Carried over from the specification and the architecture review; each is a default that can be changed.

1. A recruit has at most one manager, and manager scope is **direct reports only** (not transitive).
2. Feedback is manager-visible by default, with an `ADMIN_ONLY` option. Hidden feedback is omitted from
   manager views entirely — not even its count is reported, since a count leaks its existence.
3. Notes are private to their owner (and admins) and are excluded from manager reports.
4. Entries may not be future-dated. The lower bound is the owner's start date.
5. Signup always creates a `RECRUIT`; roles, departments and manager assignment are set by an admin.
6. Emails are stored lower-cased and are unique across active and inactive users.
7. Deactivated users cannot authenticate; their history is retained.
8. Requesting an explicitly out-of-scope owner returns `403 OUT_OF_SCOPE`; a directly addressed resource
   that the caller cannot see returns `404`. Reports are never silently narrowed to the visible subset.
9. A single 8-hour `HttpOnly` `SameSite` session cookie, rather than access/refresh token rotation.
10. Reports are generated synchronously; the seeded data volume is far below the point where that hurts.
11. Dashboard periods are the fixed set 7/30/90/365 days ending today (UTC), rather than an arbitrary
    range; the open-issue panel deliberately ignores the period, since an issue raised outside it and
    still blocking someone is the most important row on the page.
12. A team roster lists direct reports whose role is `RECRUIT`; a manager reporting to another manager
    is in scope for entry reads but is not a roster row.
13. The organisation dashboard's department breakdown lists **every active department**, including ones
    with no recruits, as a row of zeroes. This reverses the M7 assumption: once departments can be
    created from the admin screens (M10), a newly created or emptied department that silently fails to
    appear reads as a bug, and "nobody has been onboarded here yet" is a fact an admin needs. Inactive
    departments are not rows — they appear in the admin department list, which is where their state is
    managed.
14. `days_since_start` is computed for every subject per §16.2 (`today − start_date`, floored at 0), but
    the "Day N of onboarding" caption is rendered only when the subject's role is `RECRUIT`. The
    requirements attach that caption to recruit dashboards and the manager roster; on a manager's or
    admin's own dashboard it read as "Day 700 of onboarding", which is arithmetically right and
    semantically meaningless.
15. Feedback authors may still reclassify an entry to `ADMIN_ONLY` after a manager has read it. The
    requirements set a default and a per-entry opt-out (A-03) and nowhere freeze the choice at
    creation, so the product semantics are "the author decides, at any time"; the manager's next read,
    count and dashboard reflect it immediately.
16. The PDF omits the `user_id` column that the CSV carries (a uuid is unreadable on paper and the
    subject's name is already in the row), and characters outside WinAnsi — CJK, emoji — are rendered
    as `?` because only the two standard PDF fonts are embedded. The CSV export is the lossless one.
17. Charts in the PDF are a SHOULD in the requirements (§18.2) and are not implemented.

## Deferred

**Phase 2** — report `group_by`, custom `sort` and the "since start date" per-user range preset (D11 of
the architecture review: the date range plus section selection satisfies the brief), a
`/reports/history` view over the `report_runs` rows that are already written (D12),
the remaining specified dashboard metrics (activity-by-day heatmap, streak days, average issue
resolution time), refresh-token rotation,
rate limiting on authentication endpoints, OpenAPI document, full-text search across entries, dashboard
charts, bulk operations, email notifications.

**Phase 3** — multi-manager and transitive scopes, comments on entries, entry attachments, scheduled
report delivery, i18n, SSO, dark mode, mobile applications, asynchronous report generation.
