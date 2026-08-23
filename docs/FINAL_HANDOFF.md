# Final engineering handoff — Onboarding Diary (M1–M11)

Written against the code as it stands on the M11 branch (`devin/1787490000-m11-audit-log`), by reading
the implementation rather than the plan. Where the requirements audit and the code disagreed, the code
won and the audit was corrected.

## 1. Status

All eleven milestones are implemented, tested and open as a stacked series of pull requests. Every
MUST-level requirement of `docs/specification.md` has an implementation and a test **except one, which
is disclosed rather than claimed**: US-02 AC4 / FR-A6 / SEC-10, authentication rate limiting and account
lockout (D13). Login has no `429`, no lockout and no throttling; it is open to online password guessing.

Everything else on the deferred list is either a SHOULD/MAY in the specification or an approved
architecture-review deviation, listed in §9 and §10.

## 2. What is implemented

**Recruit.** Sign up and sign in; a daily task diary, an issue/blocker log, onboarding feedback and
private notes, each with create, read, update, soft delete, URL-driven filters and pagination; a personal
dashboard with completion, open issues and activity for a 7/30/90/365-day period.

**Manager.** The same diary for themselves, plus a roster of direct reports and a per-recruit detail
view. Reads are limited to direct reports; notes and `ADMIN_ONLY` feedback are invisible; the only write
into a recruit's diary is triage of an issue's `status` and `resolution_notes`.

**Admin.** Everything above across the organisation, an organisation rollup with a per-department
breakdown, full user lifecycle (create, edit, role change, manager reassignment, deactivate, reactivate,
temporary-password reset), department lifecycle (create, rename, deactivate, delete) and the audit-log
viewer (US-75).

**Reporting.** `POST /api/v1/reports` for the on-screen JSON preview, the CSV download and the PDF
download, with `SELF`/`USER`/`USERS`/`DEPARTMENT`/`ORG` scopes, an inclusive date range capped at 366
days, per-section selection and filters, and hard caps (50 users, 10 000 rows per section).

**Auditing.** An append-only `audit_logs` table covering authorization denials, cross-user writes,
privileged reads of private data, authentication events, user and department changes and report
generation.

## 3. Milestone and PR mapping

| Milestone  | Scope                                                                               | PR                                                                   |
| ---------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| M1         | Skeleton, tooling, Docker, Prisma schema, migrations, seed, `/api/health`           | [#90](https://github.com/codev-workshops/onboarding-diary/pull/90)   |
| M2         | Signup, login, logout, session cookie, protected shell                              | [#92](https://github.com/codev-workshops/onboarding-diary/pull/92)   |
| M3         | `readable_user_ids`, scoped repositories, authorization matrix                      | [#93](https://github.com/codev-workshops/onboarding-diary/pull/93)   |
| M4         | Task API and UI, module-boundary lint rule, `AUTHZ.DENIED` auditing                 | [#94](https://github.com/codev-workshops/onboarding-diary/pull/94)   |
| M5         | Issue API and UI, manager triage, enforced optimistic concurrency                   | [#95](https://github.com/codev-workshops/onboarding-diary/pull/95)   |
| M6         | Feedback and notes                                                                  | [#96](https://github.com/codev-workshops/onboarding-diary/pull/96)   |
| M7         | Recruit, team and organisation dashboards                                           | [#97](https://github.com/codev-workshops/onboarding-diary/pull/97)   |
| M7 cleanup | `403 ACCOUNT_DEACTIVATED`, recruit-only onboarding-day caption, working period tabs | [#98](https://github.com/codev-workshops/onboarding-diary/pull/98)   |
| M8         | Date-ranged reports, CSV export, `ENTRY.READ_PRIVILEGED` auditing                   | [#100](https://github.com/codev-workshops/onboarding-diary/pull/100) |
| M9         | PDF export rendered from the authorized report model                                | [#101](https://github.com/codev-workshops/onboarding-diary/pull/101) |
| M10        | Admin user and department management, temporary passwords, full audit set           | [#102](https://github.com/codev-workshops/onboarding-diary/pull/102) |
| M11        | Admin audit-log listing and UI (US-75)                                              | [#103](https://github.com/codev-workshops/onboarding-diary/pull/103) |

Each PR targets its predecessor, so the stack merges bottom-up: #90 → #92 → #93 → #94 → #95 → #96 →
#97 → #98 → #100 → #101 → #102 → #103.

## 4. Architecture

A modular monolith: one Next.js 15 App Router application (React 19, TypeScript strict, Tailwind CSS 4)
serving both the UI and the REST API, backed by PostgreSQL 16 through Prisma 6. Validation is Zod;
passwords are bcrypt (cost 12); sessions are `jose`-signed JWTs; PDFs are `pdf-lib`.

Layering is **route handler → service → scoped repository**:

- Handlers (`app/api/v1/**/route.ts`) resolve the actor, parse with Zod and serialise. They hold no
  `where` clause.
- Services (`src/modules/*/service.ts`) hold the rules.
- `src/modules/entries/base-repository.ts` is the only place an entry delegate is named. Every entry
  query is built from `owner_id ∈ readable_user_ids(actor)` plus `deleted_at IS NULL`.

The boundary is mechanical, not conventional: an ESLint rule plus `tests/unit/module-boundaries.spec.ts`
prevent any route, page or component from importing the Prisma client, and prevent any module outside
`src/modules/entries` from touching an entry delegate. Two files are explicit, commented exceptions —
`src/modules/audit/service.ts` (the writer) and `src/modules/audit/query-service.ts` (the US-75 reader),
because the audit table is not entry data and is not owner-scoped.

Dashboards are aggregates over the same predicate: the grouped queries live in
`src/modules/entries/repositories.ts`, so a manager's rollup counts exactly the rows they could have
listed individually, with no second rule to keep in sync.

## 5. Security and authorization

```
readable_user_ids(actor) :=
    ADMIN    -> every user id            ({ kind: 'ALL' }, compiled to a predicate-free clause)
    MANAGER  -> {actor.id} ∪ {u.id : u.manager_id = actor.id}
    RECRUIT  -> {actor.id}
```

- Applied **inside the SQL**, never as a post-filter, and evaluated live from `users.manager_id`, so a
  reassignment takes effect on the next request.
- Manager scope is direct reports only; it is not transitive, and an unassigned recruit is admin-only.
- Notes are owner-private (admins excepted, and audited); `ADMIN_ONLY` feedback is invisible to managers
  including in counts, filters and dashboards.
- **403 when you named the subject, 404 when you addressed the resource**, so existence is never
  disclosed. A report naming an out-of-scope user fails with `403 OUT_OF_SCOPE` rather than being
  narrowed to the visible subset.
- Field-level, all-or-nothing writes: a manager's issue patch may carry only `status` and
  `resolution_notes` (`403 FIELD_NOT_PERMITTED`); `role`, `manager_id`, `is_active` and `email` are never
  settable through the self-service profile route (`403 FORBIDDEN_FIELD`).
- Optimistic concurrency is real: `expected_version` is part of the `UPDATE` predicate and a stale write
  loses with `409 VERSION_CONFLICT`.
- Sessions: one signed JWT carrying only the subject, in an `HttpOnly; SameSite=Lax; Secure` cookie with
  an 8-hour TTL. Role and `is_active` are re-read from the database on every request. A valid cookie on a
  disabled account answers `403 ACCOUNT_DEACTIVATED`; a missing or forged one answers `401`.
- `middleware.ts` verifies the cookie signature only and is a UX gate, not the authorization boundary.
- Temporary passwords are enforced centrally in `requireCurrentUser`: until it is changed, every call but
  `GET /users/me` and `POST /users/me/password` is refused with `403 PASSWORD_CHANGE_REQUIRED`.
- CSRF protection is `SameSite=Lax` plus a mandatory JSON content type on every mutation, logout
  included. There is no double-submit token; this holds only while the API stays JSON-only.

## 6. Auditing

`audit_logs` is append-only: a database trigger raises on `UPDATE` and `DELETE`
(`prisma/migrations/20260822155010_audit_logs/migration.sql`). Rows record actor, actor role, action,
entity type and id, target user, before/after, IP, user agent, request id and timestamp.

Actions written (`src/modules/audit/service.ts`): `AUTHZ.DENIED`, `ENTRY.CROSS_USER_UPDATED`,
`ENTRY.READ_PRIVILEGED`, `AUTH.LOGIN_SUCCESS`, `AUTH.LOGIN_FAILED`, `AUTH.LOGOUT`,
`AUTH.PASSWORD_CHANGED`, `AUTH.PASSWORD_RESET`, `USER.{CREATED,UPDATED,ROLE_CHANGED,MANAGER_CHANGED,
DEACTIVATED,REACTIVATED}`, `DEPARTMENT.{CREATED,UPDATED,DEACTIVATED,DELETED}` and `REPORT.GENERATED`.
`report_runs` separately records every report attempt, including denials, with its parameters, row count
and duration.

Two write modes, deliberately: data changes share the write's transaction (`recordAudit(input, tx)`), so
a change and its record commit together; authentication and authorization events are best-effort
(`recordAuditBestEffort`), because a failed audit write must not turn a valid sign-in into a 500 or a 403
into a 500.

Privacy at write time: any string longer than 120 characters is replaced with `{ redacted: true, length }`
, so the audit table records _that_ a description changed and by how much, never its contents. Passwords
and temporary passwords are never written in any form.

## 7. US-75 — the admin audit-log viewer (M11)

- `GET /api/v1/audit-logs` (`app/api/v1/audit-logs/route.ts`) — a thin handler over
  `listAuditLogs(actor, query)`.
- `src/modules/audit/query-service.ts` — `assertRole(actor, ['ADMIN'])` first, then a `select` that
  exposes id, action, entity type/id, actor (id, name, role), target (id, name), before/after, IP,
  request id and timestamp. `user_agent` and password material are not selected; the rows were already
  minimised at write time, so the reader adds no second redaction.
- Filters: `actor_user_id`, `target_user_id`, `action`, `entity_type`, `date_from`, `date_to` (inclusive
  of the whole end day), plus `page`/`page_size`; ordering is newest first. The schema is `.strict()`, so
  an unknown or empty filter is `422 VALIDATION_ERROR` rather than a silently empty page.
- `app/(app)/admin/audit/page.tsx` and `components/admin/audit-log-table.tsx` — the admin UI, with an
  action filter, a date range, clear, and previous/next paging driven entirely through the URL. A
  non-admin gets the not-found screen in the browser and `403 INSUFFICIENT_ROLE` from the API.

Tests: `tests/unit/audit-schemas.spec.ts` (filter contract), `tests/integration/audit-log-endpoints.spec.ts`
(anonymous 401, manager/recruit 403 plus the `AUTHZ.DENIED` row it writes, ordering, every filter,
pagination and totals, unknown/empty filter rejection, and an assertion that no diary content, seed
password or bcrypt hash appears in a page), and the audit case in `tests/e2e/admin.spec.ts`.

## 8. Validation

Reproduced on a **clean clone of the M11 branch** against a freshly reset database:

| Command                                | Result                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------- |
| `npm ci`                               | clean install                                                          |
| `npm run db:reset`                     | migrations + seed                                                      |
| `npm run lint`                         | 0 errors, 1 warning (unused `_kind` in `tests/unit/safe-path.spec.ts`) |
| `npm run format:check`                 | clean                                                                  |
| `npm run typecheck`                    | clean                                                                  |
| `npm test`                             | **257 passed** (23 files)                                              |
| `npm run test:integration`             | **276 passed** (10 files)                                              |
| `npm run build`                        | succeeds                                                               |
| `npm run db:reset && npm run test:e2e` | **39 passed**                                                          |

The integration suite reads seeded users and asserts seeded counts, so it must run immediately after a
`db:reset`. `tests/integration/audit-log-endpoints.spec.ts` cannot clean up after itself — the
append-only trigger rejects deletes — so it tags its fixtures with a random per-run marker and relies on
`db:reset` to clear them.

**CI:** GitHub Actions `verify` (lint, format, typecheck, unit, migrate, seed, integration, build,
Playwright, on a PostgreSQL 16 service container) is green on the stack, and Devin Review is green on
#102 and #103. All three Devin Review findings raised on #102 were fixed in `e317212`:

1. `reassign_to` is validated whenever supplied, not only on the demotion path (`assertReassignmentTarget`
   rejects self-reference, then reuses `assertAssignableManager` for nonexistent, recruit, inactive and
   cycle-creating targets) — and the check runs before the transaction opens, so an invalid reassignment
   mutates nothing.
2. `MANAGER → ADMIN` is no longer treated as a demotion: the guard reads
   `before.role === 'MANAGER' && nextRole !== 'MANAGER' && nextRole !== 'ADMIN'`, so `MANAGER_HAS_REPORTS`
   applies only when leaving the manager-capable roles and a promoted manager keeps their reports.
3. The organisation rollup seeds its rows from **active** departments only and counts members of an
   inactive department under `Unassigned`, so a deactivated department no longer reappears while an
   active empty one still shows a zero row and the totals reconcile.

Regression coverage: `tests/integration/admin-endpoints.spec.ts` (findings 1 and 2) and
`tests/integration/dashboard-endpoints.spec.ts` (finding 3).

## 9. Approved deviations (D-numbers from `docs/architecture-review.md`)

| Ref       | Item                                                                           | State                                                        |
| --------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| D1        | Refresh-token rotation, reuse detection, token families                        | Not built — a single 8-hour session cookie                   |
| D2/SEC-20 | `token_epoch` session invalidation                                             | Not built — role/active state is re-read per request instead |
| D4        | Audit-log viewer                                                               | **Built in M11 (US-75)**                                     |
| D6        | Forgot-password email flow                                                     | Admin-initiated reset shipped as the specified fallback      |
| D9        | `q` full-text search with pg_trgm                                              | Not built                                                    |
| D10       | Activity heatmap, streak days, average issue-resolution time, dashboard charts | Not built                                                    |
| D11       | Report `group_by`, custom sort, "since start date" ranges                      | Not built                                                    |
| D12       | `/reports/history` endpoint                                                    | Not built (`report_runs` rows are persisted)                 |
| D13       | Auth rate limiting and lockout (**US-02 AC4**)                                 | **Not built — the one unmet MUST**                           |
| D14       | Bulk operations, `Idempotency-Key`, `/meta/enums`                              | Not built                                                    |
| D15       | PDF charts, print stylesheet, tagged-PDF accessibility                         | Not built (charts are a SHOULD)                              |
| D17       | Unified `/history` timeline                                                    | Not built                                                    |

## 10. Known gaps

- **US-02 AC4 / FR-A6 / SEC-10:** no rate limiting or lockout on authentication. Closing this first is
  the recommendation.
- SEC-02/SEC-08: no HSTS or CSP/security-header middleware.
- SEC-04: no CSRF token; the protection is `SameSite=Lax` plus the JSON content-type requirement.
- SEC-16: no `npm audit`/Dependabot gate in CI.
- SEC-21: no explicit body-size or JSON-depth cap beyond framework defaults.
- The session cookie is `Secure` only when `NODE_ENV=production`.
- §12.8: `/ready` and `/meta/enums` are not implemented; `/api/health` covers liveness and a DB ping.
- The PDF renders non-WinAnsi characters (CJK, emoji) as `?` and omits the `user_id` column; the CSV is
  the lossless export.
- The 10 000-row report cap is unit-tested only, never exercised against a dataset that large.
- NFR-01…NFR-05 and NFR-16 are unmeasured (no load testing, no backup/restore drill); NFR-07
  accessibility and NFR-09 responsiveness at 320 px were not systematically audited.

## 11. Reproducing the environment

```bash
git clone https://github.com/codev-workshops/onboarding-diary.git
cd onboarding-diary
git checkout devin/1787490000-m11-audit-log

cp .env.example .env          # set DATABASE_URL and SESSION_SECRET
npm ci
docker compose up -d db       # PostgreSQL 16 on localhost:5432
npm run db:reset              # migrate + seed
npm run dev                   # http://localhost:3000
```

Or run the whole stack in containers with `docker compose up --build`; a one-shot `migrate` service
applies migrations and seeds before the app starts.

Every seeded account uses `Passw0rd!23`. The org chart is deliberately shaped to expose scope leaks: two
managers with disjoint recruits, and one recruit (`noah.silva@onboarding.test`) with no manager at all.

## 12. Readiness assessment

**Recommendation: proceed.** The stack is intact, ordered and mergeable bottom-up; CI and Devin Review
are green on the head PRs; the full suite reproduces from a clean checkout and a fresh database; and the
one unmet MUST is disclosed here, in the README and in the requirements audit rather than implied to be
covered.

Before this ran in production I would, in order: implement rate limiting and lockout (US-02 AC4); add
security headers and a CSP; add a `npm audit`/Dependabot gate; measure the NFR targets and add a
backup/restore drill; and revisit CSRF the moment a non-JSON endpoint is introduced.
