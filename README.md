# onboarding-diary

Onboarding Diary Application - A web application for new recruits to document their
onboarding journey.

## Documentation

- [docs/BRD.md](docs/BRD.md) — business requirements, personas, user flows, acceptance
  criteria.
- [docs/TRD.md](docs/TRD.md) — architecture, data model, API, authentication, error
  handling.
- [docs/TASKS.md](docs/TASKS.md) — epics and dependency-ordered implementation tasks.

## Repository layout

```
apps/api          Express + TypeScript API      (@onboarding-diary/api)
apps/web          React + TypeScript SPA        (@onboarding-diary/web)
packages/shared   Enums, Zod schemas, DTOs      (@onboarding-diary/shared)
docs              BRD, TRD, task breakdown
```

The repo is an npm workspaces monorepo. The API is feature-complete for v1 (Epics 0–10):
tooling, shared contracts, the Prisma data model and seed, the API foundation,
authentication and authorisation, the users/tasks/issues/feedback/notes resources, the
dashboards, and CSV/PDF reports. `apps/web` has its Epic 11 foundation — Vite, Tailwind,
routing with role-aware guards, the API client, the auth context, TanStack Query, the UI
primitives, and the form wiring — with the feature pages arriving in Epics 12–17.

## Prerequisites

- Node 24 (`.nvmrc` pins the major version; `nvm use` picks it up)
- Docker and Docker Compose, for PostgreSQL and the containerised dev servers

## Setup

```bash
npm install        # installs all workspaces and the husky pre-commit hook
cp .env.example .env
docker compose up -d postgres
npm run migrate    # applies Prisma migrations to the database in .env
npm run seed       # one admin, two managers, six recruits with sample entries
```

`DATABASE_URL` in `.env` points at `localhost` so host tooling (migrations, tests) works;
Compose overrides the host with the `postgres` service name inside its network.
`TEST_DATABASE_URL` names a separate database that the integration suite creates,
migrates, and truncates automatically.

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
| `npm run migrate`       | `prisma migrate dev` for the API workspace      |
| `npm run seed`          | Seed the database with demo users and entries   |
| `npm run test:coverage` | Vitest with V8 coverage                         |
| `npm run clean`         | Remove build output                             |

## Local development with Docker

```bash
docker compose up
```

- `postgres` — PostgreSQL 16 on `localhost:5432`, data in the `postgres-data` volume
- `api` — installs dependencies, applies migrations, and runs the API in watch mode on
  `localhost:4000`
- `web` — installs dependencies and runs the web dev server on `localhost:5173`

The `api` and `web` services mount the repository and keep `node_modules` in named
volumes, so host and container installs do not collide. The web service runs the Vite dev
server, which reads its API base URL from `VITE_API_BASE_URL`.

The API exposes `GET /health` (200 with the database up, 503 when it is unreachable) and,
under `/api/v1`: `auth`, `users`, `tasks`, `issues`, `feedback`, `notes`, `dashboard`, and
`reports`. See [docs/TRD.md](docs/TRD.md) section 4 for the full surface.

To run only the database while working on the host:

```bash
docker compose up postgres
```

## Pre-commit hooks

`npm install` runs `husky` via the `prepare` script, installing `.husky/pre-commit`,
which runs `lint-staged`: ESLint with autofix and Prettier on staged files. If the hook
rewrites files, re-stage them and commit again.
