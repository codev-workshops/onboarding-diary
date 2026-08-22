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

Seed baseline: 4 departments, 10 users (1 ADMIN / 2 MANAGER / 7 RECRUIT), 133 entries
(87 tasks, 23 issues, 11 feedback, 12 notes). Demo password for every account: `Passw0rd!23`
(bcrypt `$2b$12$`). Managers `marcus.bell@` and `dana.lee@` have disjoint recruit sets;
`noah.silva@` has `manager_id IS NULL`.

## Testing the CHECK constraints

Prisma cannot express CHECK constraints; they live in
`prisma/migrations/*/migration.sql`. Test them with raw SQL inside a transaction using
`SAVEPOINT`/`ROLLBACK TO` per case (with `\set ON_ERROR_STOP off`), then `ROLLBACK` the outer
transaction so the seed data is untouched. Note that `psql` `\echo` output and error output
can interleave out of order — match errors by the constraint name in the message, not by position.

The `completed_at`/`resolved_at` rules are intentionally **one-way**: `CANCELLED` tasks and
reopened (`OPEN`) issues may keep their timestamps. Tests asserting a biconditional are wrong.

## Health probe

`GET /api/health` → 200 `{"status":"ok","database":"up",...}`; with the DB stopped
(`docker stop onboarding-diary-db`) it returns 503 `{"status":"degraded","database":"down",...}`
with no error detail (S14). It self-heals when the DB is restarted, no app restart needed.

Known issue to watch for: the compose healthcheck for `app` fetches `http://127.0.0.1:3000`,
but the Next.js standalone server binds to `$HOSTNAME` (the container ID), so the container is
reported `unhealthy` even while HTTP works from the host. If you see this, check whether
`HOSTNAME: '0.0.0.0'` is set on the `app` service; a workaround for testing is to probe from the
host with `curl localhost:3000/api/health` instead of trusting the container health status.
