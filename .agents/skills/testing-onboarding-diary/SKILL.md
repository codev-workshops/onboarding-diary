---
name: testing-onboarding-diary
description: How to run, seed and test the Onboarding Diary app (Next.js 15 + Prisma + PostgreSQL) locally and in Docker, including DB constraint and health-probe testing.
---

# Testing the Onboarding Diary app

## Running the stack

Full containerised stack (db → one-shot `migrate` → `app`):

```bash
docker compose up --build -d      # app on http://localhost:3000, Postgres on 5432
docker inspect onboarding-diary-migrate --format '{{.State.ExitCode}}'   # expect 0
docker logs onboarding-diary-migrate | grep Seeded
```

Re-running `docker compose up -d` re-runs the migrate/seed container; the seed is
idempotent (upsert by email/natural key), so row counts must be unchanged.

Local dev path (host Postgres comes from `docker compose up -d db`):

```bash
cp .env.example .env    # DATABASE_URL=postgresql://onboarding:onboarding@localhost:5432/onboarding_diary
npm ci && npm run db:migrate && npm run db:seed
PORT=3001 npm run dev   # use a non-3000 port if the docker app is already bound to 3000
```

Checks that must all exit 0: `npm run lint`, `npm run format:check`, `npm run typecheck`,
`npm test`, `npm run build`, `npm run test:e2e`.
Caveat: `format:check` runs Prettier over the whole tree, so **do not leave scratch/test-plan
markdown files inside the repo** — they will fail the check. Keep them in `/home/ubuntu`.
`playwright test` reuses an already-running server on `$PORT` (or set `E2E_BASE_URL`).

## Database access

```bash
docker exec onboarding-diary-db psql -U onboarding -d onboarding_diary -c '<sql>'
```

Seed baseline: 4 departments, 10 users (1 ADMIN / 2 MANAGER / 7 RECRUIT). The entry count is
**not stable across milestones** (M1 branch seeded 133 entries; the M7 branch seeds 125 —
74 tasks / 20 issues / 14 feedback / 17 notes). Always re-read the counts from
`npm run db:reset` output instead of asserting an old number. Demo password for every account:
`Passw0rd!23` (bcrypt `$2b$12$`). Managers `marcus.bell@` and `dana.lee@` have disjoint recruit
sets; `noah.silva@` has `manager_id IS NULL` and is visible only to admins.
Get the seeded UUIDs you need with:

```bash
docker exec onboarding-diary-db psql -U onboarding -d onboarding_diary -tAc \
  "select email, id, role from users order by role, email;"
```

## Testing the CHECK constraints

Prisma cannot express CHECK constraints; they live in
`prisma/migrations/*/migration.sql`. Test them with raw SQL inside a transaction using
`SAVEPOINT`/`ROLLBACK TO` per case (with `\set ON_ERROR_STOP off`), then `ROLLBACK` the outer
transaction so the seed data is untouched. Note that `psql` `\echo` output and error output
can interleave out of order — match errors by the constraint name in the message, not by position.

The `completed_at`/`resolved_at` rules are intentionally **one-way**: `CANCELLED` tasks and
reopened (`OPEN`) issues may keep their timestamps. Tests asserting a biconditional are wrong.

## Testing auth-scoped features (M2+: dashboards, entries, team views)

Get session cookies without the browser and reuse them with curl:

```bash
curl -s -c /tmp/c_marcus.txt -H 'content-type: application/json' \
  -d '{"email":"marcus.bell@onboarding.test","password":"Passw0rd!23"}' \
  localhost:3000/api/v1/auth/login
curl -s -b /tmp/c_marcus.txt localhost:3000/api/v1/dashboard/team
```

A genuine cookie whose user has `is_active=false` answers 403 `ACCOUNT_DEACTIVATED`; missing,
tampered, truncated and orphaned (valid signature, no such user) cookies all stay 401
`UNAUTHENTICATED`, so a forged token never gets the 403 that would confirm the subject exists. To
mint a valid token for the orphaned case, run the script from the repository root (`jose` is ESM and
only resolvable there) and read `SESSION_SECRET` from `.env`.

Expected error contract (`src/shared/http/errors.ts`): 401 `UNAUTHENTICATED`, 403
`INSUFFICIENT_ROLE` / `OUT_OF_SCOPE`, 404 `NOT_FOUND`, 422 `VALIDATION_ERROR`. API query schemas
are `.strict()` Zod, so unknown keys (`?foo=1`) and non-enum values (`?days=5`) are 422, while
**pages** silently fall back to the default period instead of erroring — do not expect a page 422.
Page-level denials go through `src/shared/http/page-guard.ts` and render Next's 404 screen so the
existence of another user's diary is not disclosed; assert the 404 body contains no name.

Privacy invariants worth re-testing on any aggregate/report feature: a recruit's `NOTE` entries and
their `ADMIN_ONLY` feedback must be invisible to managers **in counts as well as lists**
(`notes_total` stays 0, `feedback_total` unchanged), while the owner and admins see them. Create
the fixtures through the UI as the recruit, then diff the manager vs admin JSON for the same user.
Dashboard DTOs deliberately omit emails — `grep -c '@onboarding.test'` over the payloads should be 0.

## Health probe

`GET /api/health` → 200 `{"status":"ok","database":"up",...}`; with the DB stopped
(`docker stop onboarding-diary-db`) it returns 503 `{"status":"degraded","database":"down",...}`
with no error detail (S14). It self-heals when the DB is restarted, no app restart needed.

Known issue to watch for: the compose healthcheck for `app` fetches `http://127.0.0.1:3000`,
but the Next.js standalone server binds to `$HOSTNAME` (the container ID), so the container is
reported `unhealthy` even while HTTP works from the host. If you see this, check whether
`HOSTNAME: '0.0.0.0'` is set on the `app` service; a workaround for testing is to probe from the
host with `curl localhost:3000/api/health` instead of trusting the container health status.
