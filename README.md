# Onboarding Diary

A web application for new recruits to document their onboarding journey — track diary entries, milestones, and receive mentor feedback.

## Tech Stack

| Layer           | Technology                                     |
| --------------- | ---------------------------------------------- |
| Frontend        | React 19, Vite 6, TypeScript 5, Tailwind CSS 4 |
| Backend         | Node.js 20+, Express 4, TypeScript 5           |
| Database        | PostgreSQL 16                                  |
| ORM             | Prisma 6                                       |
| Auth            | JWT (access + refresh tokens)                  |
| Validation      | Zod (shared between client and server)         |
| State           | TanStack React Query 5, React Context          |
| Forms           | React Hook Form + Zod resolver                 |
| Package Manager | pnpm 9+ (workspaces)                           |

## Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0
- **Docker** (for local PostgreSQL) or a PostgreSQL 16 instance
- **Git**

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/codev-workshops/onboarding-diary.git
cd onboarding-diary
pnpm install
```

### 2. Start the database

```bash
docker compose up -d
```

This starts PostgreSQL on `localhost:5432` with credentials `postgres/postgres`.

### 3. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
```

The defaults work out of the box with the Docker Compose database. Update `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in production.

### 4. Run database migrations and seed

```bash
pnpm db:migrate     # Create/apply migrations
pnpm db:seed        # Seed with sample users and programs
```

### 5. Start development servers

```bash
pnpm dev            # Starts both API (port 3000) and Web (port 5173)
```

Or individually:

```bash
pnpm dev:api        # API only on http://localhost:3000
pnpm dev:web        # Web only on http://localhost:5173
```

### 6. Open the app

Navigate to `http://localhost:5173`. Test credentials (password: `Password1!`):

| Role         | Email                            |
| ------------ | -------------------------------- |
| System Admin | `admin@onboarding-diary.local`   |
| HR Admin     | `hr@onboarding-diary.local`      |
| Mentor       | `mentor@onboarding-diary.local`  |
| Recruit      | `recruit@onboarding-diary.local` |

## Project Structure

```
onboarding-diary/
├── apps/
│   ├── api/                  # Express backend
│   │   ├── prisma/           # Schema, migrations, seed
│   │   └── src/
│   │       ├── config/       # Env validation, DB client, CORS
│   │       ├── errors/       # Custom error classes
│   │       ├── middleware/    # Auth, RBAC, validation, error handler, rate limiter
│   │       ├── modules/      # Feature modules (auth, user, diary, etc.)
│   │       └── utils/        # JWT, hashing, pagination, logger
│   └── web/                  # React frontend
│       └── src/
│           ├── api/          # Axios client + API functions
│           ├── components/   # Reusable UI components
│           ├── context/      # Auth context + provider
│           ├── guards/       # Route guards (auth, role)
│           ├── hooks/        # Custom hooks
│           ├── pages/        # Page components (by role)
│           ├── router/       # React Router config
│           ├── styles/       # Tailwind globals
│           └── utils/        # Helpers (cn, date, format)
├── packages/
│   └── shared/               # @onboarding-diary/shared
│       └── src/
│           ├── enums.ts      # Role, Visibility, MilestoneCategory, etc.
│           ├── constants.ts  # Validation limits, pagination defaults
│           ├── types/        # DTOs shared between client and server
│           └── validation/   # Zod schemas (used by both sides)
├── docs/
│   ├── REQUIREMENTS.md       # Functional & non-functional requirements
│   └── ARCHITECTURE.md       # System architecture document
├── docker-compose.yml        # Local PostgreSQL
├── tsconfig.base.json        # Shared TypeScript config
├── eslint.config.js          # Shared ESLint config
└── pnpm-workspace.yaml       # Workspace definition
```

## Available Scripts

| Script                 | Description                       |
| ---------------------- | --------------------------------- |
| `pnpm dev`             | Start all dev servers in parallel |
| `pnpm dev:web`         | Start frontend dev server only    |
| `pnpm dev:api`         | Start backend dev server only     |
| `pnpm build`           | Build all packages                |
| `pnpm build:web`       | Build frontend only               |
| `pnpm build:api`       | Build backend only                |
| `pnpm start:api`       | Start production API server       |
| `pnpm lint`            | Lint all packages                 |
| `pnpm format`          | Format all files with Prettier    |
| `pnpm format:check`    | Check formatting                  |
| `pnpm typecheck`       | Type-check all packages           |
| `pnpm db:migrate`      | Run Prisma migrations (dev)       |
| `pnpm db:migrate:prod` | Deploy migrations (production)    |
| `pnpm db:seed`         | Seed database with sample data    |
| `pnpm db:studio`       | Open Prisma Studio GUI            |
| `pnpm db:generate`     | Regenerate Prisma client          |
| `pnpm clean`           | Remove all dist/node_modules      |

## Setup Decisions

### Why pnpm workspaces?

pnpm provides strict dependency isolation (no phantom dependencies), fast installs via content-addressable storage, and native workspace support. Unlike npm workspaces, pnpm prevents packages from accidentally importing undeclared dependencies, catching issues early.

### Why `apps/` + `packages/` structure?

Separating deployable applications (`apps/`) from shared libraries (`packages/`) makes the dependency graph explicit. `apps/web` and `apps/api` both depend on `packages/shared` but never on each other. This matches conventions used by Turborepo and Nx projects.

### Why a shared package?

Zod validation schemas are defined once in `@onboarding-diary/shared` and consumed by both the Express validation middleware (server) and React Hook Form resolver (client). This guarantees validation rules never drift between frontend and backend. Shared DTOs ensure API contracts are typed end-to-end.

### Why Tailwind CSS v4?

Tailwind v4 uses the new CSS-first configuration approach with `@import "tailwindcss"` and the `@tailwindcss/vite` plugin. No `tailwind.config.ts` file is needed — configuration is done via CSS custom properties in `globals.css`. This simplifies the setup and improves build performance.

### Why `tsx` for the API dev server?

`tsx` (powered by esbuild) provides instant TypeScript execution without a separate compilation step. It supports ESM, path aliases, and hot reloading via `tsx watch` — making it the fastest option for Node.js TypeScript development without configuring ts-node or swc.

### Why Zod for env validation?

Environment variables are validated at server startup using a Zod schema. If any required variable is missing or invalid, the server exits immediately with a clear error message. This prevents cryptic runtime errors from misconfiguration.

### Why UUID primary keys?

UUIDs prevent ID enumeration attacks, allow client-side ID generation (future), and are safe for distributed systems. The performance trade-off vs. auto-incrementing integers is negligible at our expected scale.

### Why path aliases (`@/`)?

Both `apps/web` (via Vite `resolve.alias`) and `apps/api` (via TypeScript `paths`) support `@/` as an alias for `./src/`. This eliminates fragile relative imports like `../../../utils/hash.js` in favor of clean `@/utils/hash.js`.

### Why ESM (`"type": "module"`)?

All packages use native ES modules. This aligns with the modern Node.js ecosystem, enables tree-shaking, and avoids the complexity of mixed CJS/ESM interop. The backend uses `.js` extensions in imports as required by Node.js ESM resolution.

## API Health Check

```bash
curl http://localhost:3000/api/v1/health
```

```json
{
  "status": "healthy",
  "timestamp": "2026-05-24T10:00:00.000Z",
  "version": "0.1.0",
  "uptime": 42
}
```

## Documentation

- [Technical Requirements](docs/REQUIREMENTS.md) — functional specs, user stories, DB design, API specs
- [System Architecture](docs/ARCHITECTURE.md) — architecture decisions, deployment, testing strategy
