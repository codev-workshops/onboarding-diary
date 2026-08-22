# Onboarding Diary

A diary application for new recruits: daily tasks, blockers, onboarding feedback and personal notes,
with manager-scoped views and reporting on top.

- Full requirements: `docs/specification.md`
- Architecture review that this build follows (MVP scope, simplifications, milestones): `docs/architecture-review.md`

> **Status: Milestone 1 of 10 complete.** The skeleton, database schema and seed data exist and are
> verified. **Authentication, authorization and the application APIs are not implemented yet** — the
> only route today is the health probe. See [Implementation status](#implementation-status).

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

The app container applies migrations and runs the seed on every start; both steps are idempotent.

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
  (public)/            login, signup                        [M2]
  (app)/               dashboard, tasks, issues, feedback,
                       notes, team, reports, profile        [M4-M8]
  (admin)/admin/users  user and department administration    [M10]
  api/v1/...           REST API                              [M2+]
  api/health           liveness + readiness probe            done
src/
  modules/
    auth/              password hashing, sessions            [M2]
    authz/             readable_user_ids(actor), guards      [M3]
    users/             profiles, admin user management       [M10]
    entries/           tasks, issues, feedback, notes        [M4-M5]
    dashboard/         aggregation queries                   [M6]
    reports/           date-ranged reports, CSV and PDF      [M8-M9]
  shared/
    config/            environment parsing
    db/                Prisma client
    testing/           fixtures shared by tests
prisma/
  schema.prisma        models, enums, indexes
  migrations/          SQL migrations, including CHECK constraints
  seed.ts              demo data
tests/
  unit/                Vitest
  api/                 Vitest, route-level (authorization matrix lands in M3)
  e2e/                 Playwright
```

Layering rule, enforced from M3 onwards: **route handler → service → scoped repository**. Handlers parse
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

| Command                | Purpose                                    |
| ---------------------- | ------------------------------------------ |
| `npm run dev`          | Development server                         |
| `npm run build`        | Production build                           |
| `npm run lint`         | ESLint                                     |
| `npm run format:check` | Prettier check (`npm run format` to write) |
| `npm run typecheck`    | `tsc --noEmit`                             |
| `npm test`             | Vitest unit and API tests                  |
| `npm run test:e2e`     | Playwright end-to-end tests                |
| `npm run db:migrate`   | Create/apply migrations in development     |
| `npm run db:deploy`    | Apply migrations in CI and production      |
| `npm run db:seed`      | Seed demo data (idempotent)                |
| `npm run db:reset`     | Drop, re-migrate and re-seed               |

CI (`.github/workflows/ci.yml`) runs lint, format check, typecheck, unit tests, migrations, seed, build
and Playwright against a PostgreSQL 16 service container.

## Implementation status

| Milestone | Scope                                                              | Status  |
| --------- | ------------------------------------------------------------------ | ------- |
| M1        | Skeleton, tooling, Docker, schema, migration, seed, `/health`      | Done    |
| M2        | Signup, login, logout, session cookie, protected shell             | Next    |
| M3        | Authorization module, scoped repository, authorization test matrix | Planned |
| M4        | Task CRUD with filters and pagination                              | Planned |
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

Not implemented yet, by design: authentication, sessions, authorization, entry APIs and UI, dashboard,
reports, exports, and admin screens.

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
