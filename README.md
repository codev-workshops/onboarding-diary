# Onboarding Diary

A diary application for new recruits: daily tasks, blockers, onboarding feedback and personal notes,
with manager-scoped views and reporting on top.

- Full requirements: `docs/specification.md`
- Architecture review that this build follows (MVP scope, simplifications, milestones): `docs/architecture-review.md`

> **Status: Milestone 3 of 10 complete.** The skeleton, database, seed data, authentication and the
> authorization core are in place: `readable_user_ids` is enforced in SQL by scoped repositories, and the
> authorization matrix runs in CI. **The diary APIs and UI are not implemented yet** — the guards exist
> before the endpoints that must use them. See [Implementation status](#implementation-status).

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
  (app)/               dashboard, tasks, issues, feedback,
                       notes, team, reports, profile        [M4-M8]
  (app)/admin/users    user and department administration    [M10]
  api/v1/auth/...      signup, login, logout, me             done
  api/v1/...           the rest of the REST API              [M4+]
  api/health           liveness + readiness probe            done
middleware.ts          cookie-signature gate for app routes  done
src/
  modules/
    auth/              password hashing, sessions, cookies   done
    authz/             readable_user_ids(actor), guards      done
    users/             profiles, scoped directory reads      done (admin CRUD [M10])
    entries/           scoped repositories                   done (CRUD [M4-M5])
    dashboard/         aggregation queries                   [M6]
    reports/           date-ranged reports, CSV and PDF      [M8-M9]
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

| Command                    | Purpose                                        |
| -------------------------- | ---------------------------------------------- |
| `npm run dev`              | Development server                             |
| `npm run build`            | Production build                               |
| `npm run lint`             | ESLint                                         |
| `npm run format:check`     | Prettier check (`npm run format` to write)     |
| `npm run typecheck`        | `tsc --noEmit`                                 |
| `npm test`                 | Vitest unit and API tests                      |
| `npm run test:integration` | Authorization matrix against a seeded database |
| `npm run test:e2e`         | Playwright end-to-end tests                    |
| `npm run db:migrate`       | Create/apply migrations in development         |
| `npm run db:deploy`        | Apply migrations in CI and production          |
| `npm run db:seed`          | Seed demo data (idempotent)                    |
| `npm run db:reset`         | Drop, re-migrate and re-seed                   |

CI (`.github/workflows/ci.yml`) runs lint, format check, typecheck, unit tests, migrations, seed, the
authorization matrix (`npm run test:integration`), build
and Playwright against a PostgreSQL 16 service container.

## Implementation status

| Milestone | Scope                                                              | Status  |
| --------- | ------------------------------------------------------------------ | ------- |
| M1        | Skeleton, tooling, Docker, schema, migration, seed, `/health`      | Done    |
| M2        | Signup, login, logout, session cookie, protected shell             | Done    |
| M3        | Authorization module, scoped repository, authorization test matrix | Done    |
| M4        | Task CRUD with filters and pagination                              | Next    |
| M5        | Issues, feedback and notes                                         | Planned |
| M6        | Recruit dashboard                                                  | Planned |
| M7        | Manager team list and recruit detail views                         | Planned |
| M8        | Date-ranged reports and CSV export                                 | Planned |
| M9        | PDF export                                                         | Planned |
| M10       | Admin user/department management and hardening                     | Planned |

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

Not implemented yet, by design: entry APIs and UI, dashboard, reports, exports, and admin screens. The
`/team`, `/reports` and `/admin/users` routes exist only as role-gated placeholders.

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

## Deferred

**Phase 2** — audit log for admin cross-user writes and authentication events, refresh-token rotation,
rate limiting on authentication endpoints, OpenAPI document, full-text search across entries, dashboard
charts, optimistic-concurrency enforcement using the existing `version` column, bulk operations, email
notifications.

**Phase 3** — multi-manager and transitive scopes, comments on entries, entry attachments, scheduled
report delivery, i18n, SSO, dark mode, mobile applications, asynchronous report generation.
