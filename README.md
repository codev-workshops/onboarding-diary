# onboarding-diary
Onboarding Diary Application - A web application for new recruits to document their onboarding journey

## Documentation

- [docs/MANDATE.md](docs/MANDATE.md) — the authoritative requirements document.
- [docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md) — decisions not specified in the mandate, with rationale and sign-off status.
- [docs/techstack.md](docs/techstack.md) — the chosen tech stack (React + REST) and supporting libraries.
- [docs/PLAN.md](docs/PLAN.md) — phased implementation plan (usability-first, responsive UI, unit + e2e testing).
- [docs/OPERATIONS.md](docs/OPERATIONS.md) — deploying/managing the app: demo vs production, `DB_STRING`, running processes, and the security model.
- [docs/TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md) — what is tested and how, across both SQLite (demo) and PostgreSQL (production).

> **Note:** [docs/MANDATE.md](docs/MANDATE.md) supersedes the original project description above and is the single source of truth for requirements going forward.

## Getting started

This is an npm-workspaces monorepo with a `server` (Express + Prisma REST API) and a
`client` (React + Vite).

```bash
npm install                       # installs all workspaces + generates Prisma clients
cp server/.env.example server/.env
npm run seed --workspace server   # seed the demo database (demo password: Passw0rd!)
npm run dev                       # runs the API (:4000) and the client (:5173)
```

Open http://localhost:5173 and sign in with a demo account, e.g. `admin@demo.local` /
`Passw0rd!`. In demo mode the first-use React Joyride tour is enabled.

## Demo vs. production mode

The mode is derived from a single environment variable, **`DB_STRING`** (the
production PostgreSQL connection string) — there is **no `DEMO_MODE` flag** (see
[docs/ASSUMPTIONS.md §13](docs/ASSUMPTIONS.md)):

- **`DB_STRING` absent → demo mode.** SQLite, seeded `@demo.local` demo accounts
  and sample data, onboarding tour + demo-credentials helper enabled.
- **`DB_STRING` present → production mode.** PostgreSQL; the tour and
  `GET /api/config/demo` are disabled; `@demo.local` accounts are never seeded and
  cannot log in. On startup the server validates a strong `JWT_SECRET` and that the
  database is provisioned, failing fast otherwise.

### Moving from demo to production (one-off setup tool)

Provisioning is an explicit, interactive action done **from demo mode** using the
standalone `setup/` tool (it refuses to run once `DB_STRING` is set):

```bash
npm run setup   # starts the setup tool on http://localhost:4100 (demo mode only)
```

Open http://localhost:4100 (or the "Move to production" card on the Admin overview),
enter the PostgreSQL connection string and your first administrator, and submit. The
tool applies the schema, seeds only the default task categories, creates the first
Admin (bcrypt-hashed; never resets an existing one), sets the one-way
`Setting.mode=production` latch, and — on-prem — writes `DB_STRING` and a generated
`JWT_SECRET` into `server/.env` (mode `0600`; the password is never written). On
cloud, set `DB_STRING` and `JWT_SECRET` in the platform environment instead. Then
**restart the server** and **stop the setup tool**. See
[docs/ASSUMPTIONS.md §23](docs/ASSUMPTIONS.md) for the full flow.

### Quality gates

```bash
npm run lint                         # eslint (server + client + setup)
npm run typecheck                    # tsc --noEmit (server + client + setup)
npm run test                         # unit + API tests (Vitest)
npm run build                        # production build (server + client)
npm run test:integration --workspace server   # PostgreSQL path via Testcontainers (needs Docker)
npm run test:integration --workspace setup    # demo→production cutover via Testcontainers (needs Docker)
npm run e2e                          # Playwright e2e — demo mode (SQLite)
npm run e2e:prod                     # Playwright e2e — production mode (PostgreSQL via Testcontainers, needs Docker)
```

See [docs/TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md) for what each layer covers.

CI (`.github/workflows/ci.yml`) runs all of the above on every push and pull request.
