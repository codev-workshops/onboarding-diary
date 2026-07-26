# onboarding-diary

Onboarding Diary Application — a web application where new recruits document their onboarding
journey: tasks, blockers, feedback, and notes, with dashboards for their manager and
administration for HR.

## Documentation

- [docs/BRD.md](docs/BRD.md) — business requirements, personas, user flows, acceptance
  criteria.
- [docs/TRD.md](docs/TRD.md) — architecture, data model, API, authentication, error
  handling.
- [docs/TASKS.md](docs/TASKS.md) — epics and dependency-ordered implementation tasks.
- [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md) — automated a11y checks and the manual
  360/768/1280 px checklist.
- [docs/RUNBOOK.md](docs/RUNBOOK.md) — production build, migration-on-deploy, health checks,
  logs, rollback.

## Repository layout

```
apps/api               Express 5 + TypeScript API      (@onboarding-diary/api)
  prisma/              Schema, migrations, seed
  src/modules/         One folder per resource: router, service, tests
  src/middleware/      Auth, error handling, request logging
apps/web               React 19 + Vite SPA             (@onboarding-diary/web)
  src/app/             Shell, routing, guards, error boundary
  src/components/ui/   Primitives: fields, table, dialog, states
  src/features/        One folder per screen area
  src/lib/             API client, query keys, form helpers
packages/shared        Enums, labels, limits, Zod schemas, DTOs
deploy/                Production Dockerfiles, nginx config, API entrypoint
docs/                  BRD, TRD, tasks, accessibility, runbook
```

An npm workspaces monorepo. `packages/shared` is the single source of truth for enums,
validation, and DTOs, so the API and the SPA cannot drift apart. Both apps are feature-complete
for v1: authentication and profiles, the four diary resources with filtering and pagination, the
recruit/manager/admin dashboards, CSV and PDF reports, manager read-only views of direct
reports, and admin user management.

## Prerequisites

- Node 24 (`.nvmrc` pins the major version; `nvm use` picks it up)
- Docker and Docker Compose, for PostgreSQL and the containerised dev servers

## Setup

From a fresh clone to a running app:

```bash
nvm use                       # Node 24
npm install                   # all workspaces plus the husky pre-commit hook
cp .env.example .env          # defaults work for local development
docker compose up -d postgres # PostgreSQL 16 on localhost:5432
npm run migrate               # applies Prisma migrations to the database in .env
npm run seed                  # one admin, two managers, six recruits with sample entries
npm run dev --workspace @onboarding-diary/api   # http://localhost:4000
npm run dev --workspace @onboarding-diary/web   # http://localhost:5173
```

Open http://localhost:5173 and log in with a seeded account — all of them share the password
`onboarding-demo-2026`:

| Account                      | Role    | Sees                               |
| ---------------------------- | ------- | ---------------------------------- |
| `nadia.recruit@example.com`  | Recruit | Their own diary and dashboard      |
| `marcus.manager@example.com` | Manager | Their direct reports, read-only    |
| `priya.admin@example.com`    | Admin   | Everyone, plus user administration |

The seed is idempotent, so re-running it refreshes the fixture without duplicating rows.

## Environment variables

Copy `.env.example` to `.env`. The API validates its configuration at startup with Zod and
exits listing any missing or malformed key.

| Variable                 | Scope | Default (dev)                  | Purpose                                |
| ------------------------ | ----- | ------------------------------ | -------------------------------------- |
| `POSTGRES_USER`          | infra | `onboarding`                   | Compose PostgreSQL credentials         |
| `POSTGRES_PASSWORD`      | infra | `onboarding`                   | Compose PostgreSQL credentials         |
| `POSTGRES_DB`            | infra | `onboarding_diary`             | Compose database name                  |
| `POSTGRES_PORT`          | infra | `5432`                         | Host port for PostgreSQL               |
| `DATABASE_URL`           | api   | localhost connection string    | PostgreSQL connection string           |
| `TEST_DATABASE_URL`      | api   | `..._test` connection string   | Database the integration suite manages |
| `JWT_SECRET`             | api   | placeholder                    | Access-token signing key, ≥ 32 chars   |
| `ACCESS_TOKEN_TTL`       | api   | `15m`                          | Access-token lifetime                  |
| `REFRESH_TOKEN_TTL_DAYS` | api   | `14`                           | Refresh-cookie lifetime                |
| `WEB_ORIGIN`             | api   | `http://localhost:5173`        | Allowed CORS origin                    |
| `PORT`                   | api   | `4000`                         | API port                               |
| `LOG_LEVEL`              | api   | `info`                         | pino level                             |
| `WEB_PORT`               | web   | `5173`                         | Dev-server port                        |
| `VITE_API_BASE_URL`      | web   | `http://localhost:4000/api/v1` | API base URL, compiled into the bundle |

`DATABASE_URL` points at `localhost` so host tooling (migrations, tests) works; Compose
overrides the host with the `postgres` service name inside its network. `TEST_DATABASE_URL`
names a separate database that the integration suite creates, migrates, and truncates
automatically — never point it at a database with real data.

## Scripts

Run from the repository root; each fans out to every workspace.

| Command                 | Purpose                                         |
| ----------------------- | ----------------------------------------------- |
| `npm run build`         | Type-check and emit `dist/` for every workspace |
| `npm run typecheck`     | Type-check without emitting                     |
| `npm run lint`          | ESLint over the whole repo                      |
| `npm run lint:fix`      | ESLint with autofix                             |
| `npm run format:check`  | Prettier check                                  |
| `npm run format`        | Prettier write                                  |
| `npm test`              | Vitest in every workspace                       |
| `npm run test:coverage` | Vitest with V8 coverage                         |
| `npm run migrate`       | `prisma migrate dev` for the API workspace      |
| `npm run seed`          | Seed the database with demo users and entries   |
| `npm run clean`         | Remove build output                             |

Per workspace, add `--workspace @onboarding-diary/api` (or `/web`, `/shared`); the API and web
workspaces also have `dev` (watch mode) and the API has `migrate:deploy` and `generate`.

## Migrations

Schema changes live in `apps/api/prisma/schema.prisma`.

```bash
npm run migrate                                                  # create + apply in dev
npm run migrate:deploy --workspace @onboarding-diary/api         # apply only, for CI/prod
npm run generate --workspace @onboarding-diary/api               # regenerate the client
```

The generated Prisma client is written to `apps/api/src/generated/prisma` and is not committed;
`npm run build` and `npm run typecheck` regenerate it. Enum values are mirrored in
`packages/shared` and `apps/api/tests/enum-parity.test.ts` fails if the two drift.

## Testing

```bash
npm test                                        # every workspace
npm test --workspace @onboarding-diary/api      # Vitest + Supertest against TEST_DATABASE_URL
npm test --workspace @onboarding-diary/web      # Vitest + Testing Library in jsdom
npm run test:coverage                           # V8 coverage per workspace
```

The API integration suite needs PostgreSQL running (`docker compose up -d postgres`); it
creates and migrates the test database itself. Web tests mock the network at the API-client
boundary, so no server is needed. `apps/web/src/accessibility.test.tsx` runs axe-core over the
key screens — see [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md).

## Local development with Docker

```bash
docker compose up
```

- `postgres` — PostgreSQL 16 on `localhost:5432`, data in the `postgres-data` volume
- `api` — installs dependencies, applies migrations, and runs the API in watch mode on
  `localhost:4000`
- `web` — installs dependencies and runs the web dev server on `localhost:5173`

The `api` and `web` services mount the repository and keep `node_modules` in named volumes, so
host and container installs do not collide. To run only the database while working on the host:

```bash
docker compose up postgres
```

The API exposes `GET /health` (200 with the database up, 503 when it is unreachable) and, under
`/api/v1`: `auth`, `users`, `tasks`, `issues`, `feedback`, `notes`, `dashboard`, and `reports`.
See [docs/TRD.md](docs/TRD.md) section 4 for the full surface.

## Production

`docker-compose.prod.yml` builds the two production images — the compiled API, which applies
migrations before serving, and the SPA behind nginx — and is the reference topology.
[docs/RUNBOOK.md](docs/RUNBOOK.md) has the procedure, required variables, health checks, log
expectations, and rollback.

## Pre-commit hooks

`npm install` runs `husky` via the `prepare` script, installing `.husky/pre-commit`, which runs
`lint-staged`: ESLint with autofix and Prettier on staged files. If the hook rewrites files,
re-stage them and commit again.
