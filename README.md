# onboarding-diary
Onboarding Diary Application - A web application for new recruits to document their onboarding journey

## Documentation

- [docs/MANDATE.md](docs/MANDATE.md) — the authoritative requirements document.
- [docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md) — decisions not specified in the mandate, with rationale and sign-off status.
- [docs/techstack.md](docs/techstack.md) — the chosen tech stack (React + REST) and supporting libraries.
- [docs/PLAN.md](docs/PLAN.md) — phased implementation plan (usability-first, responsive UI, unit + e2e testing).

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

### Quality gates

```bash
npm run lint                         # eslint (server + client)
npm run typecheck                    # tsc --noEmit (server + client)
npm run test                         # unit + API tests (Vitest)
npm run build                        # production build (server + client)
npm run test:integration --workspace server   # PostgreSQL path via Testcontainers (needs Docker)
npm run e2e                          # Playwright end-to-end tests
```

CI (`.github/workflows/ci.yml`) runs all of the above on every push and pull request.
