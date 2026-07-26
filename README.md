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

The repo is an npm workspaces monorepo. Only the tooling foundation (Epic 0) exists so
far; the workspaces contain placeholder modules that build and are covered by a smoke
test.

## Prerequisites

- Node 24 (`.nvmrc` pins the major version; `nvm use` picks it up)
- Docker and Docker Compose, for PostgreSQL and the containerised dev servers

## Setup

```bash
npm install        # installs all workspaces and the husky pre-commit hook
cp .env.example .env
```

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
| `npm run clean`         | Remove build output                             |

## Local development with Docker

```bash
docker compose up
```

- `postgres` — PostgreSQL 16 on `localhost:5432`, data in the `postgres-data` volume
- `api` — installs dependencies and runs the API in watch mode on `localhost:4000`
- `web` — installs dependencies and runs the web dev server on `localhost:5173`

The `api` and `web` services mount the repository and keep `node_modules` in named
volumes, so host and container installs do not collide. Both run watch/dev commands that
become meaningful once Epic 3 and Epic 11 land.

To run only the database while working on the host:

```bash
docker compose up postgres
```

## Pre-commit hooks

`npm install` runs `husky` via the `prepare` script, installing `.husky/pre-commit`,
which runs `lint-staged`: ESLint with autofix and Prettier on staged files. If the hook
rewrites files, re-stage them and commit again.
